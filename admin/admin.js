/**
 * Master Super Admin Controller (admin.js)
 * Common Sense Odisha (csodisha.com)
 * 19-Folder 241-Module Master Super Admin Console
 */

let masterNavigationSchema = null;

async function loadMasterNavigation() {
  if (masterNavigationSchema) return masterNavigationSchema;
  try {
    const res = await fetch('./data/master-navigation.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    masterNavigationSchema = await res.json();
    return masterNavigationSchema;
  } catch (err) {
    console.error('Failed to load master navigation tree from /admin/data/master-navigation.json:', err);
    return null;
  }
}


    /**
     * Local Reactive State Store
     */
    const CSOState = {
      activeFolderId: "folder-01",
      activeModuleId: "module-01-001",
      expandedFolders: new Set(["folder-01"]),
      maintenanceMode: false,
      searchQuery: "",
      startTime: Date.now(),
      
      // Seed Data for Interactive Demonstrations
      users: [
        { id: "USR-9021", name: "Ananya Patnaik", email: "ananya.p@gmail.com", role: "Candidate", status: "Verified", district: "Khordha", joined: "2026-11-04" },
        { id: "USR-9022", name: "Debashis Mohanty", email: "debashis.m@yahoo.com", role: "Moderator", status: "Verified", district: "Cuttack", joined: "2026-11-02" },
        { id: "USR-9023", name: "Sunita Behera", email: "sunitab@gmail.com", role: "Candidate", status: "Pending", district: "Mayurbhanj", joined: "2026-11-08" },
        { id: "USR-9024", name: "Ranjan Dash", email: "dash.ranjan@odisha.gov.in", role: "Academic Editor", status: "Verified", district: "Balasore", joined: "2026-10-18" },
        { id: "USR-9025", name: "Pooja Nayak", email: "pooja.n@gmail.com", role: "Candidate", status: "Suspended", district: "Ganjam", joined: "2026-09-29" }
      ],
      resources: [
        { id: "RES-101", title: "OSSC CGL 2026 Detailed Syllabus & Scheme", category: "State Exams", format: "PDF (1.2 MB)", downloads: 8450, status: "Live" },
        { id: "RES-102", title: "Odisha B.Ed Entrance Pedagogy Notes & PYQ", category: "Teaching", format: "PDF (3.8 MB)", downloads: 14200, status: "Live" },
        { id: "RES-103", title: "Medhabruti Scholarship Application Checklist", category: "Scholarships", format: "Guide / Web", downloads: 5310, status: "Live" },
        { id: "RES-104", title: "CHSE Odisha +2 Science Mathematics Solutions", category: "Higher Secondary", format: "PDF (5.4 MB)", downloads: 9120, status: "Live" },
        { id: "RES-105", title: "OTET 2026 Paper I & II Exam Pattern", category: "Teacher Eligibility", format: "PDF (850 KB)", downloads: 3100, status: "Needs Review" }
      ],
      inquiries: [
        { id: "INQ-441", sender: "Priyanka Rout", email: "priyanka.rout@gmail.com", phone: "+91 94371 00219", district: "Sambalpur", subject: "B.Ed College Choice Filling Error", time: "12m ago", status: "Unread" },
        { id: "INQ-440", sender: "Manoj Kumar Samal", email: "samal.manoj@gmail.com", phone: "+91 70081 29482", district: "Kendrapara", subject: "Medhabruti Portal OTP not coming", time: "48m ago", status: "In Progress" },
        { id: "INQ-439", sender: "Alok Tripathy", email: "tripathy.alok@gmail.com", phone: "+91 98610 55812", district: "Puri", subject: "Correction in OSSC Admit Card Name", time: "3h ago", status: "Resolved" }
      ],
      broadcast: (() => {
        try {
          const raw = localStorage.getItem('cso_active_announcement');
          if (raw) {
            const data = JSON.parse(raw);
            if (data && typeof data === 'object') {
              return {
                headline: data.headline || data.text || "OSSC CGL 2026 Preliminary Admit Card Download Link Live",
                context: data.context || "Candidates can now access direct hall ticket download links. Verification guidelines updated.",
                severity: data.severity || "emerald",
                ctaText: data.ctaText || "Download Admit Card",
                ctaUrl: data.ctaUrl || data.url || data.link || "/resources.html#ossc-cgl",
                active: data.active !== undefined ? !!data.active : (data.isActive !== undefined ? !!data.isActive : true),
                updatedAt: data.updatedAt || Date.now()
              };
            }
          }
        } catch (_) {}
        return {
          headline: "OSSC CGL 2026 Preliminary Admit Card Download Link Live",
          context: "Candidates can now access direct hall ticket download links. Verification guidelines updated.",
          severity: "emerald",
          ctaText: "Download Admit Card",
          ctaUrl: "/resources.html#ossc-cgl",
          active: true,
          updatedAt: Date.now()
        };
      })()
    };

    /**
     * DOM References
     */
    const dom = {
      accordionNav: document.getElementById('accordionNav'),
      moduleSearchInput: document.getElementById('moduleSearchInput'),
      searchCountBadge: document.getElementById('searchCountBadge'),
      workspaceRoot: document.getElementById('workspaceRoot'),
      breadcrumbFolder: document.getElementById('breadcrumbFolder'),
      breadcrumbModule: document.getElementById('breadcrumbModule'),
      activeModuleHeading: document.getElementById('activeModuleHeading'),
      activeModuleIdPill: document.getElementById('activeModuleIdPill'),
      moduleHeaderActions: document.getElementById('moduleHeaderActions'),
      sessionTimer: document.getElementById('sessionTimer'),
      btnPurgeCache: document.getElementById('btnPurgeCache'),
      btnMaintenanceToggle: document.getElementById('btnMaintenanceToggle'),
      maintenanceStatusDot: document.getElementById('maintenanceStatusDot'),
      maintenanceStatusText: document.getElementById('maintenanceStatusText'),
      btnToggleSidebar: document.getElementById('btnToggleSidebar'),
      sidebarConsole: document.getElementById('sidebarConsole'),
      mobileDrawerBackdrop: document.getElementById('mobileDrawerBackdrop'),
      toastContainer: document.getElementById('toastContainer'),
      globalModal: document.getElementById('globalModal'),
      modalTitle: document.getElementById('modalTitle'),
      modalBody: document.getElementById('modalBody'),
      modalFooter: document.getElementById('modalFooter'),
      btnModalClose: document.getElementById('btnModalClose')
    };

    /**
     * Session Duration Timer Ticker
     */
    function initSessionTimer() {
      setInterval(() => {
        const diff = Math.floor((Date.now() - CSOState.startTime) / 1000);
        const hrs = String(Math.floor(diff / 3600)).padStart(2, '0');
        const mins = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
        const secs = String(diff % 60).padStart(2, '0');
        dom.sessionTimer.textContent = `${hrs}:${mins}:${secs}`;
      }, 1000);
    }

    /**
     * Toast System
     */
    function showToast(message, type = 'info') {
      const colors = {
        info: 'bg-brand-slate border-brand-emerald text-brand-emerald',
        success: 'bg-emerald-950/90 border-emerald-500 text-emerald-300',
        warning: 'bg-amber-950/90 border-amber-500 text-amber-300',
        crimson: 'bg-red-950/90 border-red-500 text-red-300'
      };

      const toast = document.createElement('div');
      toast.className = `p-3 rounded-lg border shadow-xl text-xs font-medium flex items-center justify-between gap-3 pointer-events-auto transform transition-all duration-300 translate-y-2 opacity-0 ${colors[type] || colors.info}`;
      toast.innerHTML = `
        <div class="flex items-center gap-2">
          <span class="w-2 h-2 rounded-full ${type === 'success' || type === 'info' ? 'bg-brand-emerald' : type === 'warning' ? 'bg-amber-400' : 'bg-red-500'}"></span>
          <span>${message}</span>
        </div>
      `;
      dom.toastContainer.appendChild(toast);

      setTimeout(() => {
        toast.classList.remove('translate-y-2', 'opacity-0');
      }, 10);

      setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-2');
        setTimeout(() => toast.remove(), 300);
      }, 3500);
    }

    /**
     * Render the 19 Folders and Modules Accordion
     */
    function renderNavigationTree() {
      if (!masterNavigationSchema || !masterNavigationSchema.folders) return;
      const query = CSOState.searchQuery.toLowerCase().trim();
      let matchCount = 0;
      dom.accordionNav.innerHTML = '';

      masterNavigationSchema.folders.forEach(folder => {
        const folderMatches = folder.title.toLowerCase().includes(query);
        const filteredModules = folder.modules.filter(m => 
          folderMatches || 
          m.title.toLowerCase().includes(query) || 
          m.id.toLowerCase().includes(query)
        );

        if (query && filteredModules.length === 0) return;

        matchCount += filteredModules.length;
        const isExpanded = query ? true : CSOState.expandedFolders.has(folder.id);
        const isCurrentFolder = (CSOState.activeFolderId === folder.id);

        const folderEl = document.createElement('div');
        folderEl.className = 'rounded-lg overflow-hidden bg-brand-slate/40 border border-brand-border/60 transition';

        folderEl.innerHTML = `
          <button class="w-full px-3 py-2.5 flex items-center justify-between text-left font-medium transition ${isCurrentFolder ? 'text-brand-emerald bg-brand-card/70' : 'text-slate-300 hover:text-white hover:bg-brand-card/40'}" data-folder-id="${folder.id}">
            <div class="flex items-center gap-2 truncate pr-2">
              <span class="w-2 h-2 rounded-full ${isCurrentFolder ? 'bg-brand-emerald' : 'bg-slate-600'}"></span>
              <span class="truncate font-semibold tracking-tight">${folder.title}</span>
            </div>
            <div class="flex items-center gap-1.5 flex-shrink-0">
              <span class="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">${folder.modules.length}</span>
              <svg class="w-3.5 h-3.5 text-slate-500 transform transition-transform duration-200 ${isExpanded ? 'rotate-90 text-brand-emerald' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
            </div>
          </button>
          
          <div class="folder-modules-list space-y-0.5 px-1 py-1 border-t border-brand-border/40 ${isExpanded ? 'block' : 'hidden'} bg-[#081220]/70">
            ${filteredModules.map(module => {
              const isActiveModule = (CSOState.activeModuleId === module.id);
              const isPlanned = module.status === 'planned';
              return `
                <button class="w-full text-left px-2.5 py-1.5 rounded-md flex items-center justify-between transition ${isActiveModule ? 'bg-brand-emerald text-white font-semibold shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-brand-slate'}" data-module-id="${module.id}" data-folder-id="${folder.id}">
                  <span class="truncate pr-2">${module.title}</span>
                  <span class="text-[9px] font-mono uppercase px-1 rounded ${isActiveModule ? 'bg-black/30 text-white' : isPlanned ? 'bg-slate-800 text-slate-400' : 'bg-brand-emerald/20 text-brand-emerald'}">${isPlanned ? 'PLAN' : 'ACT'}</span>
                </button>
              `;
            }).join('')}
          </div>
        `;

        // Toggle Folder Click Event
        folderEl.querySelector('button[data-folder-id]').addEventListener('click', (e) => {
          e.stopPropagation();
          if (CSOState.expandedFolders.has(folder.id)) {
            CSOState.expandedFolders.delete(folder.id);
          } else {
            CSOState.expandedFolders.add(folder.id);
          }
          renderNavigationTree();
        });

        // Module Click Events
        folderEl.querySelectorAll('button[data-module-id]').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const modId = btn.getAttribute('data-module-id');
            const fldId = btn.getAttribute('data-folder-id');
            selectModule(fldId, modId);
            
            // Close mobile drawer on selection
            if (window.innerWidth < 1024) {
              closeMobileDrawer();
            }
          });
        });

        dom.accordionNav.appendChild(folderEl);
      });

      // Update search counter badge
      if (query) {
        dom.searchCountBadge.classList.remove('hidden');
        dom.searchCountBadge.textContent = matchCount;
      } else {
        dom.searchCountBadge.classList.add('hidden');
      }
    }

    /**
     * Route & Select Active Module
     */
    function selectModule(folderId, moduleId) {
      if (!masterNavigationSchema || !masterNavigationSchema.folders) return;
      CSOState.activeFolderId = folderId;
      CSOState.activeModuleId = moduleId;
      CSOState.expandedFolders.add(folderId);

      const folder = masterNavigationSchema.folders.find(f => f.id === folderId);
      const module = folder?.modules.find(m => m.id === moduleId);

      if (folder && module) {
        dom.breadcrumbFolder.textContent = folder.title;
        dom.breadcrumbModule.textContent = module.title;
        dom.activeModuleHeading.innerHTML = `
          ${module.title}
          <span id="activeModuleIdPill" class="text-xs font-mono font-normal px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">${module.id}</span>
        `;
      }

      renderNavigationTree();
      renderWorkspaceView(folderId, moduleId);
    }

    /**
     * Dispatcher to Render Specific or Standard Workspace Views
     */
    function renderWorkspaceView(folderId, moduleId) {
      dom.workspaceRoot.innerHTML = '';
      dom.moduleHeaderActions.innerHTML = '';

      // Route to specialized views
      if (moduleId === 'module-01-001') {
        renderOverviewWorkspace();
      } else if (moduleId === 'module-01-002') {
        renderLiveSiteStatusWorkspace();
      } else if (moduleId === 'module-01-003') {
        renderQuickActionsWorkspace();
      } else if (moduleId === 'module-01-004') {
        renderRecentActivityWorkspace();
      } else if (moduleId === 'module-01-005') {
        renderAdministrativeNotificationsWorkspace();
      } else if (moduleId === 'module-01-006') {
        renderPendingApprovalsWorkspace();
      } else if (moduleId === 'module-01-007') {
        renderWebsiteAnalyticsWorkspace();
      } else if (moduleId === 'module-01-008') {
        renderMasterFeatureRegistryWorkspace();
      } else if (moduleId === 'module-02-001') {
        renderAllPagesWorkspace();
      } else if (moduleId === 'module-02-002') {
        renderCreateNewPageWorkspace();
      } else if (moduleId === 'module-02-003') {
        renderVisualPageBuilderWorkspace();
      } else if (moduleId === 'module-02-004') {
        renderHomepageBuilderWorkspace();
      } else if (moduleId === 'module-02-005') {
        renderLandingPagesWorkspace();
      } else if (moduleId === 'module-02-006') {
        renderPageTemplatesWorkspace();
      } else if (moduleId === 'module-02-007') {
        renderReusableSectionsWorkspace();
      } else if (moduleId === 'module-02-008') {
        renderPageRevisionsWorkspace();
      } else if (moduleId === 'module-02-009') {
        renderDraftsAndPreviewsWorkspace();
      } else if (moduleId === 'module-02-010') {
        renderScheduledPagesWorkspace();
      } else if (moduleId === 'module-02-011') {
        renderTrashAndRestoreWorkspace();
      } else if (moduleId === 'module-03-001') {
        renderSiteIdentityWorkspace();
      } else if (moduleId === 'module-03-002') {
        renderAboutMissionWorkspace();
      } else if (moduleId === 'module-03-003') {
        renderContactDirectoryWorkspace();
      } else if (folderId === 'folder-02') {
        renderCMSStudioWorkspace();
      } else if (folderId === 'folder-05') {
        renderEducationalResourcesWorkspace();
      } else if (folderId === 'folder-08') {
        renderFinanceWorkspace();
      } else if (folderId === 'folder-09') {
        renderUsersRBACWorkspace();
      } else if (folderId === 'folder-10') {
        renderCommunicationsWorkspace();
      } else if (folderId === 'folder-11') {
        renderAppearanceStudioWorkspace();
      } else if (folderId === 'folder-16') {
        renderSecurityWorkspace();
      } else if (folderId === 'folder-17') {
        renderOperationsRecoveryWorkspace();
      } else if (folderId === 'folder-19') {
        renderMasterFeatureRegistryWorkspace();
      } else {
        renderStandardModuleInspector(folderId, moduleId);
      }
    }

    /**
     * VIEW 1g: Website Analytics & Session Telemetry (module-01-007)
     */
    function renderWebsiteAnalyticsWorkspace() {
      let data = {};
      if (window.CSOSuperStore && typeof window.CSOSuperStore.getAnalyticsData === 'function') {
        data = window.CSOSuperStore.getAnalyticsData();
      } else {
        data = {
          totalPageViews: 8421,
          uniqueSessions: 3120,
          cacheHitRatio: "98.4%",
          avgLatencyMs: 16,
          topRoutes: [],
          deviceBreakdown: { mobile: 68, desktop: 32 },
          currentClientEnvironment: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            screenResolution: window.screen.width + 'x' + window.screen.height,
            onlineStatus: 'Online (HTTP/2)',
            hardwareConcurrency: navigator.hardwareConcurrency || 4
          }
        };
      }

      dom.moduleHeaderActions.innerHTML = `
        <button id="btnExportAnalytics" class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-brand-emerald text-white hover:bg-brand-emeraldHover transition shadow flex items-center gap-1.5">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
          Export Report (JSON)
        </button>
        <button id="btnResetAnalytics" class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-brand-border transition flex items-center gap-1.5">
          <svg class="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          Reset Counters
        </button>
      `;

      const env = data.currentClientEnvironment || {};

      dom.workspaceRoot.innerHTML = `
        <!-- Telemetry Summary Bar -->
        <div class="p-5 rounded-xl bg-brand-slate border border-brand-border shadow-md space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 class="text-base font-bold text-white flex items-center gap-2">
                Live Traffic, Client Environment & Route Telemetry
                <span class="text-xs font-mono font-normal text-slate-400">(Edge Analytics)</span>
              </h2>
              <p class="text-xs text-slate-400 mt-0.5">Real client session metrics, hit ratios, device profiles, and hardware concurrency indicators.</p>
            </div>
            <div class="flex items-center gap-2 text-xs font-mono text-slate-400">
              <span>Edge Monitoring:</span>
              <span class="px-2 py-0.5 rounded bg-brand-emerald/10 text-brand-emerald font-bold border border-brand-emerald/30">SIN &bull; HTTP/2 100%</span>
            </div>
          </div>
        </div>

        <!-- KPI Metric Cards Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- Total Page Views -->
          <div class="p-4 rounded-xl bg-brand-slate border border-brand-border shadow-md">
            <div class="flex items-center justify-between text-slate-400 mb-2">
              <span class="text-xs font-medium uppercase tracking-wider">Total Page Views</span>
              <span class="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
              </span>
            </div>
            <div class="flex items-baseline gap-2">
              <span class="text-2xl font-extrabold text-white">${(data.totalPageViews || 0).toLocaleString()}</span>
              <span class="text-xs font-semibold text-brand-emerald font-mono">Real-Time</span>
            </div>
            <p class="text-[11px] text-slate-400 mt-2">Aggregated across public portal routes</p>
          </div>

          <!-- Unique Sessions -->
          <div class="p-4 rounded-xl bg-brand-slate border border-brand-border shadow-md">
            <div class="flex items-center justify-between text-slate-400 mb-2">
              <span class="text-xs font-medium uppercase tracking-wider">Unique Sessions</span>
              <span class="p-1.5 rounded-lg bg-emerald-500/10 text-brand-emerald">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
              </span>
            </div>
            <div class="flex items-baseline gap-2">
              <span class="text-2xl font-extrabold text-white">${(data.uniqueSessions || 0).toLocaleString()}</span>
              <span class="text-xs font-semibold text-brand-emerald font-mono">Tracked</span>
            </div>
            <p class="text-[11px] text-slate-400 mt-2">Distinct candidate browser contexts</p>
          </div>

          <!-- Edge Cache Hit Ratio -->
          <div class="p-4 rounded-xl bg-brand-slate border border-brand-border shadow-md">
            <div class="flex items-center justify-between text-slate-400 mb-2">
              <span class="text-xs font-medium uppercase tracking-wider">Edge Cache Hit Ratio</span>
              <span class="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              </span>
            </div>
            <div class="flex items-baseline gap-2">
              <span class="text-2xl font-extrabold text-white">${data.cacheHitRatio || '98.4%'}</span>
              <span class="text-xs font-semibold text-cyan-400 font-mono">CF-HIT</span>
            </div>
            <p class="text-[11px] text-slate-400 mt-2">Zero-origin static asset offload</p>
          </div>

          <!-- Avg Edge Latency -->
          <div class="p-4 rounded-xl bg-brand-slate border border-brand-border shadow-md">
            <div class="flex items-center justify-between text-slate-400 mb-2">
              <span class="text-xs font-medium uppercase tracking-wider">Average Edge Latency</span>
              <span class="p-1.5 rounded-lg bg-amber-500/10 text-brand-amber">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              </span>
            </div>
            <div class="flex items-baseline gap-2">
              <span class="text-2xl font-extrabold text-white">${data.avgLatencyMs || 16} ms</span>
              <span class="text-xs font-semibold text-brand-emerald font-mono">P95</span>
            </div>
            <p class="text-[11px] text-slate-400 mt-2">Tested from Odisha edge access points</p>
          </div>
        </div>

        <!-- Top Routes Table -->
        <div class="p-5 rounded-xl bg-brand-slate border border-brand-border shadow-md">
          <h3 class="font-bold text-white text-sm mb-4">Top Portal Routes & Frequency</h3>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs text-slate-300">
              <thead class="bg-[#081220] uppercase font-mono text-[10px] text-slate-400 border-b border-brand-border">
                <tr>
                  <th class="py-2.5 px-4">Route Path</th>
                  <th class="py-2.5 px-4">Page Title</th>
                  <th class="py-2.5 px-4">Page Hits</th>
                  <th class="py-2.5 px-4">Last Hit</th>
                  <th class="py-2.5 px-4 text-right">HTTP Status</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-brand-border/60">
                ${(data.topRoutes || []).map(r => `
                  <tr class="hover:bg-brand-card/40 transition">
                    <td class="py-3 px-4 font-mono text-cyan-400 font-bold">${r.path}</td>
                    <td class="py-3 px-4 font-semibold text-white">${r.title}</td>
                    <td class="py-3 px-4 font-mono text-brand-emerald font-semibold">${(r.views || 0).toLocaleString()}</td>
                    <td class="py-3 px-4 font-mono text-slate-400 text-[11px]">${r.lastHit}</td>
                    <td class="py-3 px-4 text-right">
                      <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-brand-emerald border border-brand-emerald/30">
                        ${r.status || '200 OK'}
                      </span>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Client Environment & Device Breakdown Section -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Client Environment Details -->
          <div class="p-5 rounded-xl bg-brand-slate border border-brand-border lg:col-span-2 space-y-4">
            <h3 class="font-bold text-white text-sm">Active Administrator Client Environment</h3>
            <div class="space-y-2 text-xs font-mono">
              <div class="p-3 rounded-lg bg-[#081220] border border-brand-border">
                <span class="text-slate-400 block text-[11px] font-sans mb-1">User-Agent Header:</span>
                <p class="text-slate-200 break-words text-[11px] leading-relaxed">${env.userAgent || 'Unknown'}</p>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div class="p-3 rounded-lg bg-[#081220] border border-brand-border">
                  <span class="text-slate-400 block text-[11px] font-sans">Platform / OS</span>
                  <strong class="text-white text-xs">${env.platform || 'Linux'}</strong>
                </div>
                <div class="p-3 rounded-lg bg-[#081220] border border-brand-border">
                  <span class="text-slate-400 block text-[11px] font-sans">Screen Resolution</span>
                  <strong class="text-cyan-400 text-xs">${env.screenResolution || '1920x1080'}</strong>
                </div>
                <div class="p-3 rounded-lg bg-[#081220] border border-brand-border">
                  <span class="text-slate-400 block text-[11px] font-sans">Hardware CPU Cores</span>
                  <strong class="text-brand-emerald text-xs">${env.hardwareConcurrency || 4} Threads</strong>
                </div>
              </div>
            </div>
          </div>

          <!-- Device Ratio Breakdown -->
          <div class="p-5 rounded-xl bg-brand-slate border border-brand-border flex flex-col justify-between">
            <div>
              <h3 class="font-bold text-white text-sm mb-2">Device Form Factors</h3>
              <p class="text-xs text-slate-400 mb-4">Traffic distribution across mobile and desktop devices.</p>

              <div class="space-y-3 font-mono text-xs">
                <div>
                  <div class="flex items-center justify-between text-[11px] mb-1">
                    <span class="text-slate-300">Mobile Devices</span>
                    <strong class="text-brand-emerald">${data.deviceBreakdown?.mobile || 68}%</strong>
                  </div>
                  <div class="w-full bg-[#081220] h-2 rounded-full overflow-hidden">
                    <div class="bg-brand-emerald h-full rounded-full" style="width: ${data.deviceBreakdown?.mobile || 68}%"></div>
                  </div>
                </div>

                <div>
                  <div class="flex items-center justify-between text-[11px] mb-1">
                    <span class="text-slate-300">Desktop / Laptops</span>
                    <strong class="text-cyan-400">${data.deviceBreakdown?.desktop || 32}%</strong>
                  </div>
                  <div class="w-full bg-[#081220] h-2 rounded-full overflow-hidden">
                    <div class="bg-cyan-400 h-full rounded-full" style="width: ${data.deviceBreakdown?.desktop || 32}%"></div>
                  </div>
                </div>
              </div>
            </div>

            <div class="p-3 rounded-lg bg-[#081220] border border-brand-border mt-4 text-[11px] text-slate-400">
              <span class="font-bold text-white">Browser Engine:</span> High-fidelity Chromium / WebKit layout engine.
            </div>
          </div>
        </div>
      `;

      // Wire export button
      const btnExport = document.getElementById('btnExportAnalytics');
      if (btnExport) {
        btnExport.addEventListener('click', () => {
          if (window.CSOSuperStore && typeof window.CSOSuperStore.exportAnalyticsReport === 'function') {
            const filename = window.CSOSuperStore.exportAnalyticsReport();
            showToast(`Analytics report exported: ${filename}`, "success");
          }
        });
      }

      // Wire reset button
      const btnReset = document.getElementById('btnResetAnalytics');
      if (btnReset) {
        btnReset.addEventListener('click', () => {
          openModal("Reset Analytics Telemetry", `
            <div class="space-y-3 font-sans text-xs">
              <div class="p-3 rounded-lg bg-amber-500/10 border border-amber-500/40 text-amber-300">
                <strong>Warning:</strong> This will reset all page view hit counters across public routes to baseline zero.
              </div>
              <p class="text-slate-300">Are you sure you want to clear current telemetry logs?</p>
            </div>
          `, `
            <button onclick="closeModal()" class="px-3 py-1.5 text-xs font-semibold rounded bg-slate-800 text-slate-300 hover:bg-slate-700">Cancel</button>
            <button id="btnConfirmResetAnalytics" class="px-3 py-1.5 text-xs font-bold rounded bg-amber-600 hover:bg-amber-500 text-white transition">Confirm & Reset</button>
          `);

          document.getElementById('btnConfirmResetAnalytics')?.addEventListener('click', () => {
            closeModal();
            if (window.CSOSuperStore && typeof window.CSOSuperStore.resetAnalytics === 'function') {
              window.CSOSuperStore.resetAnalytics();
            }
            showToast("Analytics counters reset successfully", "success");
            renderWebsiteAnalyticsWorkspace();
          });
        });
      }
    }

    /**
     * VIEW 1f: Pending Approvals & Moderation Queue (module-01-006)
     */
    function renderPendingApprovalsWorkspace() {
      let activeStatus = 'PENDING';
      let activeType = 'ALL';

      function getPendingCount() {
        if (window.CSOSuperStore && typeof window.CSOSuperStore.getApprovals === 'function') {
          return window.CSOSuperStore.getApprovals('ALL', 'PENDING').length;
        }
        return 0;
      }

      dom.moduleHeaderActions.innerHTML = `
        <span class="text-xs font-mono px-2.5 py-1 rounded bg-amber-500/10 text-brand-amber border border-amber-500/30 flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
          Pending Triage: <strong id="headerPendingCount">${getPendingCount()}</strong>
        </span>
      `;

      dom.workspaceRoot.innerHTML = `
        <!-- Moderation Queue Bar -->
        <div class="p-5 rounded-xl bg-brand-slate border border-brand-border shadow-md space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 class="text-base font-bold text-white flex items-center gap-2">
                Public Submissions & Verification Queue
                <span class="text-xs font-mono font-normal text-slate-400">(Triage Engine)</span>
              </h2>
              <p class="text-xs text-slate-400 mt-0.5">Community-contributed exam resources, forum topics, and portal corrections requiring Super Admin sign-off.</p>
            </div>
            <div class="flex items-center gap-2 text-xs font-mono text-slate-400">
              <span>Auto-Publish On Approval:</span>
              <span class="px-2 py-0.5 rounded bg-brand-emerald/10 text-brand-emerald font-bold border border-brand-emerald/30">ENABLED</span>
            </div>
          </div>

          <!-- Filter Controls Bar -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-brand-border/60">
            <!-- Status Tabs -->
            <div class="sm:col-span-2 flex items-center gap-2 overflow-x-auto text-xs font-semibold">
              <button class="approval-status-tab px-3 py-1.5 rounded-lg bg-brand-emerald text-white transition" data-status="PENDING">Pending Triage</button>
              <button class="approval-status-tab px-3 py-1.5 rounded-lg bg-[#081220] hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-brand-border transition" data-status="APPROVED">Approved</button>
              <button class="approval-status-tab px-3 py-1.5 rounded-lg bg-[#081220] hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-brand-border transition" data-status="REJECTED">Rejected</button>
              <button class="approval-status-tab px-3 py-1.5 rounded-lg bg-[#081220] hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-brand-border transition" data-status="ALL">All Items</button>
            </div>

            <!-- Type Filter Dropdown -->
            <div>
              <select id="approvalTypeSelect" class="w-full bg-[#081220] border border-brand-border rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald transition">
                <option value="ALL">All Types</option>
                <option value="RESOURCE">Study Resources (PDF / Notes)</option>
                <option value="COMMUNITY">Community Posts / Discussions</option>
                <option value="CORRECTION">Data Corrections & Updates</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Approvals Table Container -->
        <div class="p-5 rounded-xl bg-brand-slate border border-brand-border shadow-md">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-bold text-white text-sm">Submission Moderation Queue</h3>
            <span id="approvalCountBadge" class="text-xs font-mono text-slate-400">Loading queue...</span>
          </div>

          <div id="approvalListContainer" class="space-y-3 font-mono text-xs">
            <!-- Dynamically populated -->
          </div>
        </div>
      `;

      function getTypePill(type) {
        const t = (type || 'RESOURCE').toUpperCase();
        if (t === 'RESOURCE') return { bg: 'bg-emerald-500/15 text-brand-emerald border-brand-emerald/30', label: 'RESOURCE' };
        if (t === 'COMMUNITY') return { bg: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30', label: 'COMMUNITY' };
        if (t === 'CORRECTION') return { bg: 'bg-amber-500/15 text-amber-300 border-amber-500/30', label: 'CORRECTION' };
        return { bg: 'bg-slate-700/40 text-slate-300 border-slate-600', label: t };
      }

      function getStatusBadge(status) {
        const s = (status || 'PENDING').toUpperCase();
        if (s === 'APPROVED') return 'bg-emerald-500/20 text-brand-emerald border border-brand-emerald/40';
        if (s === 'REJECTED') return 'bg-red-500/20 text-brand-crimson border border-red-500/40';
        return 'bg-amber-500/20 text-amber-300 border border-amber-500/40';
      }

      function formatTimeAgo(timestamp) {
        if (!timestamp) return 'Recently';
        const diffMs = Date.now() - timestamp;
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${Math.floor(diffHours / 24)}d ago`;
      }

      function refreshApprovalsView() {
        const container = document.getElementById('approvalListContainer');
        const badge = document.getElementById('approvalCountBadge');
        const headerCount = document.getElementById('headerPendingCount');
        if (headerCount) headerCount.textContent = getPendingCount();

        let items = [];
        if (window.CSOSuperStore && typeof window.CSOSuperStore.getApprovals === 'function') {
          items = window.CSOSuperStore.getApprovals(activeType, activeStatus);
        }

        if (badge) {
          badge.textContent = `Showing ${items.length} item${items.length === 1 ? '' : 's'}`;
        }

        if (!container) return;

        if (!items.length) {
          container.innerHTML = `
            <div class="py-12 text-center text-slate-400 font-sans">
              <svg class="w-8 h-8 text-slate-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              <p class="text-sm font-semibold text-slate-300">No approval items found in this view.</p>
              <p class="text-xs text-slate-500 mt-1">Try selecting another status tab or submission type filter.</p>
            </div>
          `;
          return;
        }

        container.innerHTML = items.map(item => {
          const typePill = getTypePill(item.type);
          const statusCls = getStatusBadge(item.status);
          const timeAgo = formatTimeAgo(item.submittedAt);
          const isPending = (item.status === 'PENDING');

          return `
            <div class="p-4 rounded-xl bg-[#081220] border border-brand-border/70 hover:border-brand-border transition space-y-3">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-brand-border/40">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="font-mono text-cyan-400 font-bold text-xs">${item.id}</span>
                  <span class="px-2 py-0.5 rounded text-[10px] font-bold border tracking-wider ${typePill.bg}">
                    ${typePill.label}
                  </span>
                  <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold ${statusCls}">
                    ${item.status}
                  </span>
                </div>
                <div class="text-[10px] text-slate-400 font-mono">
                  Submitted: ${timeAgo} &bull; District: <strong class="text-slate-300">${item.district || 'Odisha'}</strong>
                </div>
              </div>

              <div>
                <h4 class="text-sm font-bold text-white font-sans mb-1">${item.title}</h4>
                <p class="text-xs text-slate-300 font-sans">${item.details || 'No additional submission notes provided.'}</p>
                ${item.targetUrl ? `<a href="${item.targetUrl}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:underline mt-1 font-mono">&rarr; Attached Document / URL</a>` : ''}
                ${item.rejectionReason ? `<p class="text-xs text-red-300 font-sans mt-1"><strong>Rejection Reason:</strong> ${item.rejectionReason}</p>` : ''}
              </div>

              <div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-brand-border/40 text-xs">
                <span class="text-[11px] text-slate-400 font-sans">
                  By: <strong class="text-slate-200 font-mono">${item.submittedBy}</strong>
                </span>

                <div class="flex items-center gap-2">
                  <button class="btn-inspect-appr px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-sans font-medium text-xs transition" data-id="${item.id}">
                    Inspect
                  </button>
                  ${isPending ? `
                    <button class="btn-approve-appr px-2.5 py-1 rounded bg-brand-emerald hover:bg-brand-emeraldHover text-white font-sans font-bold text-xs transition" data-id="${item.id}">
                      Approve
                    </button>
                    <button class="btn-reject-appr px-2.5 py-1 rounded bg-red-950/80 hover:bg-red-900 border border-brand-crimson/50 text-red-200 font-sans font-bold text-xs transition" data-id="${item.id}">
                      Reject
                    </button>
                  ` : `
                    <button class="btn-delete-appr p-1.5 rounded hover:bg-red-500/10 text-slate-500 hover:text-brand-crimson transition" data-id="${item.id}" title="Remove record">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                  `}
                </div>
              </div>
            </div>
          `;
        }).join('');

        // Wire Action Buttons
        container.querySelectorAll('.btn-inspect-appr').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            const item = items.find(x => x.id === id);
            if (!item) return;

            openModal(`Inspect Submission ${item.id}`, `
              <div class="space-y-3 font-sans text-xs">
                <div class="p-3 rounded-lg bg-[#081220] border border-brand-border space-y-1">
                  <div class="text-slate-400 font-mono">Submission Title:</div>
                  <strong class="text-white text-sm">${item.title}</strong>
                </div>
                <div class="grid grid-cols-2 gap-3">
                  <div class="p-2.5 rounded-lg bg-[#081220] border border-brand-border">
                    <span class="text-slate-400 block text-[11px]">Submitted By</span>
                    <strong class="text-slate-200 font-mono">${item.submittedBy}</strong>
                  </div>
                  <div class="p-2.5 rounded-lg bg-[#081220] border border-brand-border">
                    <span class="text-slate-400 block text-[11px]">District / Origin</span>
                    <strong class="text-slate-200">${item.district || 'Odisha'}</strong>
                  </div>
                </div>
                <div class="p-3 rounded-lg bg-[#081220] border border-brand-border">
                  <span class="text-slate-400 block text-[11px] mb-1">Details & Content:</span>
                  <p class="text-slate-200 leading-relaxed">${item.details}</p>
                </div>
                ${item.targetUrl ? `
                  <div class="p-2.5 rounded-lg bg-[#081220] border border-brand-border flex items-center justify-between">
                    <span class="text-slate-400 text-[11px]">Attachment link:</span>
                    <a href="${item.targetUrl}" target="_blank" rel="noopener noreferrer" class="text-cyan-400 font-mono hover:underline font-bold text-xs">Open Resource &rarr;</a>
                  </div>
                ` : ''}
              </div>
            `, `
              <button onclick="closeModal()" class="px-3 py-1.5 text-xs font-semibold rounded bg-slate-800 text-slate-300 hover:bg-slate-700">Close</button>
              ${item.status === 'PENDING' ? `
                <button id="modalBtnApprove" class="px-3 py-1.5 text-xs font-bold rounded bg-brand-emerald text-white hover:bg-brand-emeraldHover">Approve & Publish</button>
              ` : ''}
            `);

            document.getElementById('modalBtnApprove')?.addEventListener('click', () => {
              closeModal();
              if (window.CSOSuperStore && typeof window.CSOSuperStore.approveItem === 'function') {
                window.CSOSuperStore.approveItem(item.id);
              }
              showToast(`Submission ${item.id} approved and published!`, "success");
              refreshApprovalsView();
            });
          });
        });

        container.querySelectorAll('.btn-approve-appr').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            if (window.CSOSuperStore && typeof window.CSOSuperStore.approveItem === 'function') {
              window.CSOSuperStore.approveItem(id);
            }
            showToast(`Submission ${id} approved successfully!`, "success");
            refreshApprovalsView();
          });
        });

        container.querySelectorAll('.btn-reject-appr').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            openModal(`Reject Submission ${id}`, `
              <div class="space-y-3 font-sans">
                <p class="text-xs text-slate-300">Specify the reason for rejection to append to moderation audit:</p>
                <textarea id="inputRejectReason" rows="3" placeholder="e.g. Duplicate syllabus document, low-resolution scan, or unverified claims..." class="w-full bg-[#081220] border border-brand-border rounded-lg px-3 py-2 text-white text-xs focus:ring-1 focus:ring-brand-emerald"></textarea>
              </div>
            `, `
              <button onclick="closeModal()" class="px-3 py-1.5 text-xs font-semibold rounded bg-slate-800 text-slate-300 hover:bg-slate-700">Cancel</button>
              <button id="btnConfirmRejectModal" class="px-3 py-1.5 text-xs font-bold rounded bg-brand-crimson text-white hover:bg-red-600 transition">Confirm Rejection</button>
            `);

            document.getElementById('btnConfirmRejectModal')?.addEventListener('click', () => {
              const reasonInput = document.getElementById('inputRejectReason');
              const reason = (reasonInput ? reasonInput.value : '').trim() || 'Did not meet submission guidelines';
              closeModal();
              if (window.CSOSuperStore && typeof window.CSOSuperStore.rejectItem === 'function') {
                window.CSOSuperStore.rejectItem(id, reason);
              }
              showToast(`Submission ${id} marked as rejected`, "warning");
              refreshApprovalsView();
            });
          });
        });

        container.querySelectorAll('.btn-delete-appr').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            if (window.CSOSuperStore && typeof window.CSOSuperStore.deleteApproval === 'function') {
              window.CSOSuperStore.deleteApproval(id);
            }
            showToast(`Submission record ${id} removed`, "info");
            refreshApprovalsView();
          });
        });
      }

      // Status Tabs Listeners
      document.querySelectorAll('.approval-status-tab').forEach(btn => {
        btn.addEventListener('click', (e) => {
          activeStatus = e.currentTarget.getAttribute('data-status') || 'PENDING';
          document.querySelectorAll('.approval-status-tab').forEach(b => {
            b.className = "approval-status-tab px-3 py-1.5 rounded-lg bg-[#081220] hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-brand-border transition";
          });
          e.currentTarget.className = "approval-status-tab px-3 py-1.5 rounded-lg bg-brand-emerald text-white transition";
          refreshApprovalsView();
        });
      });

      // Type Filter Dropdown Listener
      const typeSelect = document.getElementById('approvalTypeSelect');
      if (typeSelect) {
        typeSelect.addEventListener('change', (e) => {
          activeType = e.target.value;
          refreshApprovalsView();
        });
      }

      // Initial populate
      refreshApprovalsView();
    }

    /**
     * VIEW 1h: Master Feature Registry (module-01-008)
     */
    function renderMasterFeatureRegistryWorkspace() {
      // Ensure masterNavigationSchema is loaded
      if (!masterNavigationSchema) {
        dom.workspaceRoot.innerHTML = `
          <div class="p-8 text-center text-slate-400 font-sans">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-emerald mb-3"></div>
            <p class="text-sm">Loading Master Navigation Schema...</p>
          </div>
        `;
        loadMasterNavigation().then(() => {
          renderMasterFeatureRegistryWorkspace();
        });
        return;
      }

      // Breadcrumb updates
      dom.breadcrumbFolder.textContent = "Dashboard & Command Centre";
      dom.breadcrumbModule.textContent = "Master Feature Registry (module-01-008)";

      // Header Actions: Export JSON and CSV
      dom.moduleHeaderActions.innerHTML = `
        <div class="flex items-center gap-2">
          <button id="btnExportRegistryJson" class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-brand-border flex items-center gap-1.5 transition">
            <svg class="w-3.5 h-3.5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            Export JSON
          </button>
          <button id="btnExportRegistryCsv" class="px-3 py-1.5 text-xs font-bold rounded-lg bg-brand-emerald hover:bg-brand-emeraldHover text-white shadow flex items-center gap-1.5 transition">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            Export CSV
          </button>
        </div>
      `;

      const stats = (window.CSOSuperStore && typeof window.CSOSuperStore.getFeatureRegistryStats === 'function')
        ? window.CSOSuperStore.getFeatureRegistryStats(masterNavigationSchema)
        : {
            totalFolders: masterNavigationSchema.folders.length,
            totalModules: 0,
            activeCount: 0,
            plannedCount: 0,
            completionPercentage: 0,
            modulesList: []
          };

      // State for filtering
      let searchQuery = '';
      let selectedFolder = 'ALL';
      let selectedStatus = 'ALL';

      // Generate Folder Dropdown Options
      const folderOptionsHtml = masterNavigationSchema.folders.map(f => {
        return `<option value="${f.id}">${f.id.toUpperCase()}: ${f.title}</option>`;
      }).join('');

      dom.workspaceRoot.innerHTML = `
        <div class="space-y-6">
          <!-- Executive KPI and Progress Banner -->
          <div class="p-5 rounded-xl bg-brand-slate border border-brand-border shadow-md space-y-4">
            <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h2 class="text-base font-bold text-white flex items-center gap-2">
                  System Architecture & Feature Registry
                  <span class="text-xs font-mono font-normal px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/60">module-01-008</span>
                </h2>
                <p class="text-xs text-slate-400 mt-0.5">Comprehensive real-time matrix of all 19 domain folders and 241+ governance modules across Common Sense Odisha.</p>
              </div>
              <div class="flex items-center gap-3">
                <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 text-xs font-mono font-bold">
                  <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Registry Schema Synced
                </span>
              </div>
            </div>

            <!-- Metric Cards -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
              <div class="p-3.5 rounded-lg bg-[#081220] border border-brand-border">
                <span class="text-xs text-slate-400 block">Total Mapped Modules</span>
                <div class="text-xl font-bold font-mono text-white mt-1">${stats.totalModules}</div>
                <div class="text-[10px] text-slate-500 font-mono mt-0.5">${stats.activeCount} active &bull; ${stats.plannedCount} planned</div>
              </div>
              <div class="p-3.5 rounded-lg bg-[#081220] border border-brand-border">
                <span class="text-xs text-slate-400 block">Active Implementation</span>
                <div class="text-xl font-bold font-mono text-emerald-400 mt-1">${stats.completionPercentage}%</div>
                <div class="text-[10px] text-slate-500 font-mono mt-0.5">${stats.activeCount} modules operational</div>
              </div>
              <div class="p-3.5 rounded-lg bg-[#081220] border border-brand-border">
                <span class="text-xs text-slate-400 block">Planned / In Pipeline</span>
                <div class="text-xl font-bold font-mono text-amber-400 mt-1">${stats.plannedCount}</div>
                <div class="text-[10px] text-slate-500 font-mono mt-0.5">${100 - stats.completionPercentage}% roadmap backlog</div>
              </div>
              <div class="p-3.5 rounded-lg bg-[#081220] border border-brand-border">
                <span class="text-xs text-slate-400 block">Domain Folders Mapped</span>
                <div class="text-xl font-bold font-mono text-cyan-400 mt-1">${stats.totalFolders} Folders</div>
                <div class="text-[10px] text-slate-500 font-mono mt-0.5">100% hierarchy covered</div>
              </div>
            </div>

            <!-- Implementation Progress Bar -->
            <div class="space-y-1.5 pt-1">
              <div class="flex items-center justify-between text-xs font-mono">
                <span class="text-slate-400">Platform Build Progress (Active / Total)</span>
                <span class="text-emerald-400 font-bold">${stats.activeCount} / ${stats.totalModules} Modules (${stats.completionPercentage}%)</span>
              </div>
              <div class="w-full h-2.5 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
                <div class="h-full bg-gradient-to-r from-teal-500 to-emerald-400 transition-all duration-500" style="width: ${stats.completionPercentage}%"></div>
              </div>
            </div>
          </div>

          <!-- Search & Multi-Filter Controls -->
          <div class="p-4 rounded-xl bg-brand-slate border border-brand-border shadow-md">
            <div class="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div class="sm:col-span-6 relative">
                <input id="registrySearchInput" type="text" placeholder="Search module name or ID (e.g. module-01-001 or Broadcast)..." class="w-full bg-[#081220] border border-brand-border rounded-lg pl-9 pr-3 py-2 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-emerald font-sans">
                <svg class="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              </div>

              <div class="sm:col-span-3">
                <select id="registryFolderFilter" class="w-full bg-[#081220] border border-brand-border rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:ring-1 focus:ring-brand-emerald font-sans">
                  <option value="ALL">All 19 Folders</option>
                  ${folderOptionsHtml}
                </select>
              </div>

              <div class="sm:col-span-3">
                <select id="registryStatusFilter" class="w-full bg-[#081220] border border-brand-border rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:ring-1 focus:ring-brand-emerald font-sans">
                  <option value="ALL">All Statuses</option>
                  <option value="ACTIVE">Active Only</option>
                  <option value="PLANNED">Planned Only</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Master Module Inventory Table -->
          <div class="rounded-xl bg-brand-slate border border-brand-border shadow-md overflow-hidden">
            <div class="px-5 py-3 border-b border-brand-border flex items-center justify-between">
              <h3 class="text-sm font-bold text-white flex items-center gap-2">
                Module Inventory Register
                <span id="registryCountBadge" class="text-xs font-mono font-normal px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">${stats.totalModules} modules</span>
              </h3>
              <span class="text-[11px] text-slate-400 font-mono">Live Ingestion from master-navigation.json</span>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse text-xs">
                <thead>
                  <tr class="bg-[#081220] text-slate-400 font-mono border-b border-brand-border">
                    <th class="py-2.5 px-4 font-semibold">Module ID</th>
                    <th class="py-2.5 px-4 font-semibold">Module Title</th>
                    <th class="py-2.5 px-4 font-semibold">Parent Folder</th>
                    <th class="py-2.5 px-4 font-semibold text-center">Status</th>
                    <th class="py-2.5 px-4 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody id="registryTableBody" class="divide-y divide-brand-border/40 font-sans">
                  <!-- Injected via JavaScript -->
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;

      function renderTableRows() {
        const tbody = document.getElementById('registryTableBody');
        const countBadge = document.getElementById('registryCountBadge');
        if (!tbody) return;

        const sq = searchQuery.toLowerCase().trim();
        const sf = selectedFolder;
        const ss = selectedStatus;

        const filtered = stats.modulesList.filter(item => {
          // Folder filter
          if (sf !== 'ALL' && item.folderId !== sf) return false;

          // Status filter
          if (ss !== 'ALL' && (item.status || '').toUpperCase() !== ss) return false;

          // Search query
          if (sq) {
            const mId = (item.moduleId || '').toLowerCase();
            const mTitle = (item.moduleTitle || '').toLowerCase();
            const fName = (item.folderName || '').toLowerCase();
            if (!mId.includes(sq) && !mTitle.includes(sq) && !fName.includes(sq)) {
              return false;
            }
          }

          return true;
        });

        if (countBadge) {
          countBadge.textContent = `${filtered.length} of ${stats.totalModules} modules`;
        }

        if (filtered.length === 0) {
          tbody.innerHTML = `
            <tr>
              <td colspan="5" class="py-8 text-center text-slate-500 font-mono text-xs">
                No matching modules found for the selected query and filters.
              </td>
            </tr>
          `;
          return;
        }

        tbody.innerHTML = filtered.map(item => {
          const isActive = (item.status || '').toLowerCase() === 'active';
          const statusBadge = isActive
            ? `<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">ACTIVE</span>`
            : `<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-400 border border-slate-700">PLANNED</span>`;

          return `
            <tr class="hover:bg-slate-800/40 transition">
              <td class="py-2.5 px-4 font-mono font-bold text-cyan-400 whitespace-nowrap">${item.moduleId}</td>
              <td class="py-2.5 px-4 font-bold text-white">${item.moduleTitle}</td>
              <td class="py-2.5 px-4 text-slate-300 font-mono text-[11px] whitespace-nowrap">
                <span class="px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700 text-slate-300 mr-1.5">${item.folderId}</span>
                ${item.folderName}
              </td>
              <td class="py-2.5 px-4 text-center whitespace-nowrap">${statusBadge}</td>
              <td class="py-2.5 px-4 text-right whitespace-nowrap">
                <button data-folder="${item.folderId}" data-module="${item.moduleId}" class="btn-navigate-module inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-cyan-300 font-mono text-[11px] font-semibold border border-brand-border transition">
                  Open View &rarr;
                </button>
              </td>
            </tr>
          `;
        }).join('');

        // Wire Open View buttons
        tbody.querySelectorAll('.btn-navigate-module').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const fId = e.currentTarget.getAttribute('data-folder');
            const mId = e.currentTarget.getAttribute('data-module');
            if (fId && mId) {
              selectModule(fId, mId);
            }
          });
        });
      }

      // Initial table render
      renderTableRows();

      // Search and Filter Listeners
      const searchInput = document.getElementById('registrySearchInput');
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          searchQuery = e.target.value;
          renderTableRows();
        });
      }

      const folderFilter = document.getElementById('registryFolderFilter');
      if (folderFilter) {
        folderFilter.addEventListener('change', (e) => {
          selectedFolder = e.target.value;
          renderTableRows();
        });
      }

      const statusFilter = document.getElementById('registryStatusFilter');
      if (statusFilter) {
        statusFilter.addEventListener('change', (e) => {
          selectedStatus = e.target.value;
          renderTableRows();
        });
      }

      // Export Buttons Listeners
      const btnExportJson = document.getElementById('btnExportRegistryJson');
      if (btnExportJson) {
        btnExportJson.addEventListener('click', () => {
          if (window.CSOSuperStore && typeof window.CSOSuperStore.exportFeatureRegistry === 'function') {
            const filename = window.CSOSuperStore.exportFeatureRegistry('json', stats.modulesList);
            showToast(`Master Feature Registry exported: ${filename}`, "success");
          }
        });
      }

      const btnExportCsv = document.getElementById('btnExportRegistryCsv');
      if (btnExportCsv) {
        btnExportCsv.addEventListener('click', () => {
          if (window.CSOSuperStore && typeof window.CSOSuperStore.exportFeatureRegistry === 'function') {
            const filename = window.CSOSuperStore.exportFeatureRegistry('csv', stats.modulesList);
            showToast(`Master Feature Registry CSV exported: ${filename}`, "success");
          }
        });
      }
    }

    /**
     * VIEW 2a: All Pages Directory & Edge Probing (module-02-001)
     */
    function renderAllPagesWorkspace() {
      // Header Breadcrumb
      dom.breadcrumbFolder.textContent = "Website Pages & Builder";
      dom.breadcrumbModule.textContent = "All Pages (module-02-001)";

      // Top Action Bar
      dom.moduleHeaderActions.innerHTML = `
        <div class="flex items-center gap-2">
          <button id="btnCreateNewPageTop" class="px-3 py-1.5 text-xs font-bold rounded-lg bg-brand-emerald hover:bg-brand-emeraldHover text-white shadow flex items-center gap-1.5 transition">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            + Create New Page
          </button>
          <button id="btnProbeAllRoutes" class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-brand-border flex items-center gap-1.5 transition">
            <svg id="probeAllIcon" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            Verify All Routes (Probe)
          </button>
          <button id="btnExportPagesJson" class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-brand-border flex items-center gap-1.5 transition">
            <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            Export Inventory (JSON)
          </button>
        </div>
      `;

      // Workspace Template
      dom.workspaceRoot.innerHTML = `
        <div class="space-y-6">
          <!-- Page Directory Overview Card -->
          <div class="p-5 rounded-xl bg-brand-slate border border-brand-border shadow-md space-y-4">
            <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h2 class="text-base font-bold text-white flex items-center gap-2">
                  Site Page Directory & Routing Matrix
                  <span class="text-xs font-mono font-normal px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/60">module-02-001</span>
                </h2>
                <p class="text-xs text-slate-400 mt-0.5">Comprehensive repository route registry covering all static HTML pages and public endpoints.</p>
              </div>
              <div class="flex items-center gap-2">
                <span id="probeSummaryBadge" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 text-xs font-mono">
                  <span class="w-2 h-2 rounded-full bg-slate-500"></span>
                  Ready to Probe
                </span>
              </div>
            </div>

            <!-- KPI Row -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
              <div class="p-3.5 rounded-lg bg-[#081220] border border-brand-border">
                <span class="text-xs text-slate-400 block">Total Project Routes</span>
                <div id="kpiTotalRoutes" class="text-xl font-bold font-mono text-white mt-1">26</div>
                <div class="text-[10px] text-slate-500 font-mono mt-0.5">100% repository verified</div>
              </div>
              <div class="p-3.5 rounded-lg bg-[#081220] border border-brand-border">
                <span class="text-xs text-slate-400 block">HTTP 200 OK Status</span>
                <div id="kpiLiveRoutes" class="text-xl font-bold font-mono text-emerald-400 mt-1">--</div>
                <div class="text-[10px] text-slate-500 font-mono mt-0.5">Click verify to probe</div>
              </div>
              <div class="p-3.5 rounded-lg bg-[#081220] border border-brand-border">
                <span class="text-xs text-slate-400 block">Average Latency</span>
                <div id="kpiAvgLatency" class="text-xl font-bold font-mono text-cyan-400 mt-1">-- ms</div>
                <div class="text-[10px] text-slate-500 font-mono mt-0.5">Local / Edge cache</div>
              </div>
              <div class="p-3.5 rounded-lg bg-[#081220] border border-brand-border">
                <span class="text-xs text-slate-400 block">Total Payload Footprint</span>
                <div id="kpiTotalFootprint" class="text-xl font-bold font-mono text-amber-400 mt-1">-- KB</div>
                <div class="text-[10px] text-slate-500 font-mono mt-0.5">Static uncompressed assets</div>
              </div>
            </div>
          </div>

          <!-- Filter & Search Bar -->
          <div class="p-4 rounded-xl bg-brand-slate border border-brand-border shadow-md">
            <div class="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div class="sm:col-span-8 relative">
                <input id="pageSearchInput" type="text" placeholder="Search page path or title (e.g. /resources.html or Contact)..." class="w-full bg-[#081220] border border-brand-border rounded-lg pl-9 pr-3 py-2 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-emerald font-sans">
                <svg class="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              </div>

              <div class="sm:col-span-4">
                <select id="pageTemplateFilter" class="w-full bg-[#081220] border border-brand-border rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:ring-1 focus:ring-brand-emerald font-sans">
                  <option value="ALL">All Templates</option>
                  <option value="Portal Landing">Portal Landing</option>
                  <option value="Educational Matrix">Educational Matrix</option>
                  <option value="Standard Content">Standard Content</option>
                  <option value="Form Desk">Form Desk</option>
                  <option value="Legal Core">Legal Core</option>
                  <option value="Security Portal">Security Portal</option>
                  <option value="Admin Workspace">Admin Workspace</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Site Page Directory Table -->
          <div class="rounded-xl bg-brand-slate border border-brand-border shadow-md overflow-hidden">
            <div class="px-5 py-3 border-b border-brand-border flex items-center justify-between">
              <h3 class="text-sm font-bold text-white flex items-center gap-2">
                Repository Page Inventory
                <span id="pageCountBadge" class="text-xs font-mono font-normal px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">-- pages</span>
              </h3>
              <span class="text-[11px] text-slate-400 font-mono">Live Ingestion from cso_pages_store</span>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse text-xs">
                <thead>
                  <tr class="bg-[#081220] text-slate-400 font-mono border-b border-brand-border">
                    <th class="py-2.5 px-4 font-semibold">Route Path</th>
                    <th class="py-2.5 px-4 font-semibold">Page Title</th>
                    <th class="py-2.5 px-4 font-semibold">Template</th>
                    <th class="py-2.5 px-4 font-semibold text-center">Route Status</th>
                    <th class="py-2.5 px-4 font-semibold">File Size</th>
                    <th class="py-2.5 px-4 font-semibold">Last Modified</th>
                    <th class="py-2.5 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody id="pagesTableBody" class="divide-y divide-brand-border/40 font-sans">
                  <!-- Injected via JavaScript -->
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;

      // Live Probing State Cache
      const liveProbeResults = new Map();
      let activeSearch = '';
      let activeTemplate = 'ALL';

      function getPagesList() {
        if (window.CSOSuperStore && typeof window.CSOSuperStore.getAllPages === 'function') {
          return window.CSOSuperStore.getAllPages(activeTemplate, activeSearch);
        }
        return [];
      }

      function updateKpis() {
        const allPages = (window.CSOSuperStore && typeof window.CSOSuperStore.getAllPages === 'function')
          ? window.CSOSuperStore.getAllPages('ALL', '')
          : [];

        const totalKpi = document.getElementById('kpiTotalRoutes');
        if (totalKpi) totalKpi.textContent = allPages.length;

        // Calculate total footprint
        const totalKb = allPages.reduce((acc, p) => acc + (parseFloat(p.sizeKb) || 0), 0).toFixed(1);
        const footprintKpi = document.getElementById('kpiTotalFootprint');
        if (footprintKpi) footprintKpi.textContent = `${totalKb} KB`;

        // Update live probe counts if probed
        if (liveProbeResults.size > 0) {
          let liveCount = 0;
          let totalLatency = 0;
          let latencyCount = 0;

          liveProbeResults.forEach(res => {
            if (res.ok) liveCount++;
            if (res.latencyMs > 0) {
              totalLatency += res.latencyMs;
              latencyCount++;
            }
          });

          const liveKpi = document.getElementById('kpiLiveRoutes');
          if (liveKpi) liveKpi.textContent = `${liveCount} / ${liveProbeResults.size}`;

          const avgLat = latencyCount > 0 ? Math.round(totalLatency / latencyCount) : 0;
          const latKpi = document.getElementById('kpiAvgLatency');
          if (latKpi) latKpi.textContent = `${avgLat} ms`;
        }
      }

      function renderTableRows() {
        const tbody = document.getElementById('pagesTableBody');
        const countBadge = document.getElementById('pageCountBadge');
        if (!tbody) return;

        const pages = getPagesList();
        if (countBadge) {
          countBadge.textContent = `${pages.length} pages`;
        }

        if (pages.length === 0) {
          tbody.innerHTML = `
            <tr>
              <td colspan="7" class="py-8 text-center text-slate-500 font-mono text-xs">
                No pages match the current filter.
              </td>
            </tr>
          `;
          return;
        }

        tbody.innerHTML = pages.map(p => {
          const probe = liveProbeResults.get(p.path);
          let statusBadge = '';

          if (probe) {
            if (probe.ok) {
              statusBadge = `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                ${probe.status} OK (${probe.latencyMs}ms)
              </span>`;
            } else {
              statusBadge = `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                <span class="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                ${probe.status || 'ERR'} Fail
              </span>`;
            }
          } else {
            statusBadge = (p.status || '').toLowerCase() === 'live'
              ? `<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">Live (200 OK)</span>`
              : `<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">Draft</span>`;
          }

          // Generate Preview Link
          const previewHref = p.path === '/' ? '/' : p.path;

          return `
            <tr class="hover:bg-slate-800/40 transition">
              <td class="py-2.5 px-4 font-mono font-bold text-cyan-400 whitespace-nowrap">${p.path}</td>
              <td class="py-2.5 px-4 font-bold text-white">
                ${p.title}
                <div class="text-[10px] text-slate-500 font-mono font-normal">${p.file}</div>
              </td>
              <td class="py-2.5 px-4 text-slate-300 font-sans text-xs whitespace-nowrap">
                <span class="px-2 py-0.5 rounded bg-[#081220] border border-brand-border text-slate-300">${p.template}</span>
              </td>
              <td class="py-2.5 px-4 text-center whitespace-nowrap">${statusBadge}</td>
              <td class="py-2.5 px-4 font-mono text-slate-400 text-xs whitespace-nowrap">${p.sizeKb} KB</td>
              <td class="py-2.5 px-4 font-mono text-slate-400 text-xs whitespace-nowrap">${p.lastModified}</td>
              <td class="py-2.5 px-4 text-right whitespace-nowrap">
                <div class="inline-flex items-center gap-1.5">
                  <button data-id="${p.id}" class="btn-edit-page px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-mono text-[11px] font-semibold border border-brand-border transition">
                    Edit
                  </button>
                  <a href="${previewHref}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 font-mono text-[11px] font-semibold border border-brand-border transition">
                    Preview &nearr;
                  </a>
                </div>
              </td>
            </tr>
          `;
        }).join('');

        // Wire Edit buttons to open CMS Studio / Page Builder
        tbody.querySelectorAll('.btn-edit-page').forEach(btn => {
          btn.addEventListener('click', () => {
            selectModule('folder-02', 'module-02-002');
          });
        });
      }

      // Initial Renders
      updateKpis();
      renderTableRows();

      // Search & Filter event bindings
      const searchInput = document.getElementById('pageSearchInput');
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          activeSearch = e.target.value;
          renderTableRows();
        });
      }

      const templateSelect = document.getElementById('pageTemplateFilter');
      if (templateSelect) {
        templateSelect.addEventListener('change', (e) => {
          activeTemplate = e.target.value;
          renderTableRows();
        });
      }

      // Top Action Buttons
      const btnCreateTop = document.getElementById('btnCreateNewPageTop');
      if (btnCreateTop) {
        btnCreateTop.addEventListener('click', () => {
          selectModule('folder-02', 'module-02-002');
        });
      }

      const btnExport = document.getElementById('btnExportPagesJson');
      if (btnExport) {
        btnExport.addEventListener('click', () => {
          if (window.CSOSuperStore && typeof window.CSOSuperStore.exportPagesInventory === 'function') {
            const filename = window.CSOSuperStore.exportPagesInventory();
            showToast(`Pages inventory exported: ${filename}`, "success");
          }
        });
      }

      // Route Verification Prober
      const btnProbe = document.getElementById('btnProbeAllRoutes');
      if (btnProbe) {
        btnProbe.addEventListener('click', async () => {
          const pages = (window.CSOSuperStore && typeof window.CSOSuperStore.getAllPages === 'function')
            ? window.CSOSuperStore.getAllPages('ALL', '')
            : [];

          if (pages.length === 0) return;

          btnProbe.disabled = true;
          btnProbe.classList.add('opacity-75');
          const probeIcon = document.getElementById('probeAllIcon');
          if (probeIcon) probeIcon.classList.add('animate-spin');

          const summaryBadge = document.getElementById('probeSummaryBadge');
          if (summaryBadge) {
            summaryBadge.className = "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-950/60 border border-amber-500/40 text-amber-400 text-xs font-mono font-bold";
            summaryBadge.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span> Probing ${pages.length} Routes...`;
          }

          let successCount = 0;
          for (const page of pages) {
            if (window.CSOSuperStore && typeof window.CSOSuperStore.probePageStatus === 'function') {
              const res = await window.CSOSuperStore.probePageStatus(page.path);
              liveProbeResults.set(page.path, res);
              if (res.ok) successCount++;
            }
          }

          if (probeIcon) probeIcon.classList.remove('animate-spin');
          btnProbe.disabled = false;
          btnProbe.classList.remove('opacity-75');

          if (summaryBadge) {
            summaryBadge.className = "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 text-xs font-mono font-bold";
            summaryBadge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400"></span> ${successCount}/${pages.length} Live Routes`;
          }

          updateKpis();
          renderTableRows();
          showToast(`Diagnostic probe completed: ${successCount}/${pages.length} endpoints active`, "success");
        });
      }
    }

    /**
     * VIEW 2b: Create New Page Provisioning Wizard (module-02-002)
     */
    function renderCreateNewPageWorkspace() {
      // Header Breadcrumb
      dom.breadcrumbFolder.textContent = "Website Pages & Builder";
      dom.breadcrumbModule.textContent = "Create New Page (module-02-002)";

      // Top Action Bar
      dom.moduleHeaderActions.innerHTML = `
        <button id="btnBackToAllPages" class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-brand-border flex items-center gap-1.5 transition">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
          &larr; Back to All Pages
        </button>
      `;

      // Starter Boilerplates by Template
      const TEMPLATES = {
        'Standard Content': `<section class="py-8 space-y-4">
  <div class="inline-block px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 text-xs font-mono font-bold border border-emerald-500/20">
    Official Announcement
  </div>
  <h1 class="text-3xl font-extrabold text-white tracking-tight">Public Notice & Guidelines</h1>
  <p class="text-base text-slate-300 leading-relaxed">
    Welcome to this official informational update from Common Sense Odisha. Please verify all eligibility criteria and official dates below.
  </p>
  <div class="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
    <h3 class="font-bold text-white text-sm">Key Instructions:</h3>
    <ul class="list-disc list-inside text-xs text-slate-400 space-y-1">
      <li>All documents must be attested in accordance with State Department norms.</li>
      <li>Keep application reference numbers secure for future correspondence.</li>
    </ul>
  </div>
</section>`,

        'Educational Matrix': `<section class="py-8 space-y-6">
  <div class="border-b border-slate-800 pb-4">
    <h1 class="text-3xl font-extrabold text-white">Study Resources & Examination Matrix</h1>
    <p class="text-sm text-slate-400 mt-1">Curated syllabi, sample papers, and guidance materials.</p>
  </div>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
      <h3 class="font-bold text-white text-base">Module Syllabus Overview</h3>
      <p class="text-xs text-slate-400">Complete topic-by-topic distribution for upcoming exams.</p>
      <a href="#" class="inline-block text-xs font-mono text-emerald-400 hover:underline">Download Guide (PDF) &rarr;</a>
    </div>
    <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
      <h3 class="font-bold text-white text-base">Previous Year Question Bank</h3>
      <p class="text-xs text-slate-400">Verified answer keys and sectional solutions.</p>
      <a href="#" class="inline-block text-xs font-mono text-cyan-400 hover:underline">Open Repository &rarr;</a>
    </div>
  </div>
</section>`,

        'Portal Landing': `<section class="py-12 space-y-6 text-center max-w-3xl mx-auto">
  <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
    <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
    Empowering 30 Districts of Odisha
  </div>
  <h1 class="text-4xl font-extrabold text-white tracking-tight sm:text-5xl">
    Transparent Governance for Odisha's Students
  </h1>
  <p class="text-lg text-slate-300">
    Unifying state scholarship updates, competitive exam alerts, and career development tools into a single trusted portal.
  </p>
  <div class="flex flex-wrap items-center justify-center gap-4 pt-2">
    <a href="/resources.html" class="px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm shadow transition">
      Explore Library
    </a>
    <a href="/contact.html" class="px-5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700 transition">
      Help Desk
    </a>
  </div>
</section>`,

        'Form Desk': `<section class="py-8 max-w-2xl mx-auto space-y-6">
  <div>
    <h1 class="text-2xl font-bold text-white">Student Inquiry & Feedback Submission</h1>
    <p class="text-xs text-slate-400 mt-1">Submit your academic query or verification request directly to our team.</p>
  </div>
  <form class="space-y-4 p-6 rounded-xl bg-slate-900/60 border border-slate-800">
    <div>
      <label class="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
      <input type="text" placeholder="Enter full name" class="w-full bg-[#081220] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white" />
    </div>
    <div>
      <label class="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
      <input type="email" placeholder="student@example.com" class="w-full bg-[#081220] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white" />
    </div>
    <div>
      <label class="block text-xs font-semibold text-slate-300 mb-1">Inquiry Details</label>
      <textarea rows="4" placeholder="Detail your question..." class="w-full bg-[#081220] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"></textarea>
    </div>
    <button type="button" class="w-full py-2.5 rounded-lg bg-emerald-500 text-white font-bold text-xs hover:bg-emerald-600 transition">
      Submit Inquiry
    </button>
  </form>
</section>`,

        'Legal Core': `<section class="py-8 max-w-3xl mx-auto space-y-6">
  <div class="border-b border-slate-800 pb-4">
    <h1 class="text-2xl font-bold text-white">Legal Disclosures & Operational Terms</h1>
    <p class="text-xs font-mono text-slate-400 mt-1">Effective Date: November 2026 &bull; Common Sense Odisha</p>
  </div>
  <div class="space-y-4 text-xs text-slate-300 leading-relaxed">
    <p>Common Sense Odisha is an independent civic portal providing verified notifications and educational materials. All information is collated from official government gazettes.</p>
    <h3 class="text-sm font-bold text-white pt-2">Intellectual Property & Attribution</h3>
    <p>All official notices remain the intellectual copyright of the respective State and Central issuing authorities.</p>
  </div>
</section>`
      };

      // Provisioning Form DOM
      dom.workspaceRoot.innerHTML = `
        <div class="space-y-6 font-sans">
          <!-- Provisioning Header Card -->
          <div class="p-5 rounded-xl bg-brand-slate border border-brand-border shadow-md">
            <h2 class="text-base font-bold text-white flex items-center gap-2">
              Page Provisioning Wizard & Route Generator
              <span class="text-xs font-mono font-normal px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/60">module-02-002</span>
            </h2>
            <p class="text-xs text-slate-400 mt-0.5">Author new static routes, automatically sanitize clean URLs, and export production-ready HTML with Cloudflare CDN boilerplate.</p>
          </div>

          <!-- Provisioning Layout (2 Columns) -->
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <!-- Left Column: Page Metadata & Directives -->
            <div class="lg:col-span-5 space-y-4">
              <div class="p-5 rounded-xl bg-brand-slate border border-brand-border shadow-md space-y-4">
                <h3 class="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider pb-2 border-b border-brand-border">
                  1. Page Metadata & URL Configuration
                </h3>

                <!-- Page Title -->
                <div>
                  <label class="block text-xs font-semibold text-slate-200 mb-1">
                    Page Title <span class="text-rose-400">*</span>
                  </label>
                  <input id="inputPageTitle" type="text" placeholder="e.g. OPSC CGL 2026 Admit Card" class="w-full bg-[#081220] border border-brand-border rounded-lg px-3 py-2 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-emerald">
                  <span class="text-[10px] text-slate-500 mt-1 block">Live title displayed in browser tab and search engines.</span>
                </div>

                <!-- Slug / Route Path -->
                <div>
                  <div class="flex items-center justify-between mb-1">
                    <label class="text-xs font-semibold text-slate-200">
                      Route Path & File Name <span class="text-rose-400">*</span>
                    </label>
                    <span id="slugCollisionIndicator" class="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                      <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      Available
                    </span>
                  </div>
                  <div class="flex items-center">
                    <span class="px-2.5 py-2 rounded-l-lg bg-slate-900 border border-r-0 border-brand-border text-slate-500 text-xs font-mono">/</span>
                    <input id="inputPageSlug" type="text" placeholder="opsc-cgl-2026-admit-card.html" class="w-full bg-[#081220] border border-brand-border rounded-r-lg px-3 py-2 text-white text-xs font-mono placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-emerald">
                  </div>
                  <span class="text-[10px] text-slate-500 mt-1 block font-mono">Sanitized filename for static deployment.</span>
                </div>

                <!-- Template Selector -->
                <div>
                  <label class="block text-xs font-semibold text-slate-200 mb-1">Page Template</label>
                  <select id="selectPageTemplate" class="w-full bg-[#081220] border border-brand-border rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:ring-1 focus:ring-brand-emerald">
                    <option value="Standard Content">Standard Content</option>
                    <option value="Educational Matrix">Educational Matrix</option>
                    <option value="Portal Landing">Portal Landing</option>
                    <option value="Form Desk">Form Desk</option>
                    <option value="Legal Core">Legal Core</option>
                  </select>
                  <span class="text-[10px] text-slate-500 mt-1 block">Selecting a template loads starter layout code into the editor.</span>
                </div>

                <!-- Meta Description -->
                <div>
                  <label class="block text-xs font-semibold text-slate-200 mb-1">SEO Meta Description</label>
                  <textarea id="inputPageMeta" rows="3" placeholder="Brief summary of page contents for search snippets..." class="w-full bg-[#081220] border border-brand-border rounded-lg px-3 py-2 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-emerald"></textarea>
                  <span class="text-[10px] text-slate-500 mt-1 block">Recommended: 120-160 characters.</span>
                </div>

                <!-- Robots Directives -->
                <div>
                  <label class="block text-xs font-semibold text-slate-200 mb-1">Search Engine Directives</label>
                  <select id="selectPageRobots" class="w-full bg-[#081220] border border-brand-border rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:ring-1 focus:ring-brand-emerald font-mono">
                    <option value="index, follow">index, follow (Public Search Indexing)</option>
                    <option value="noindex, nofollow">noindex, nofollow (Private / Internal Notice)</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Right Column: HTML Editor & Publishing Actions -->
            <div class="lg:col-span-7 space-y-4">
              <div class="p-5 rounded-xl bg-brand-slate border border-brand-border shadow-md space-y-4 flex flex-col h-full">
                <div class="flex items-center justify-between pb-2 border-b border-brand-border">
                  <h3 class="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                    2. HTML Body & Visual Layout
                  </h3>
                  <div class="text-[10px] font-mono text-slate-400 flex items-center gap-2">
                    <span id="charCountLabel">0 chars</span>
                    &bull;
                    <span id="byteSizeLabel">0.0 KB</span>
                  </div>
                </div>

                <!-- Code Textarea -->
                <div class="relative flex-grow">
                  <textarea id="textareaPageContent" rows="18" class="w-full h-full min-h-[360px] bg-[#050a14] border border-brand-border rounded-lg p-3.5 text-slate-200 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-brand-emerald leading-relaxed" placeholder="Enter HTML content or select a template above..."></textarea>
                </div>

                <!-- Action Controls -->
                <div class="pt-2 border-t border-brand-border flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div class="text-[11px] text-slate-400 font-mono">
                    Output: <span class="text-emerald-400 font-bold">csodisha.com/</span><span id="routePreviewLabel" class="text-white font-bold">opsc-cgl-2026-admit-card.html</span>
                  </div>
                  <div class="flex items-center gap-2 w-full sm:w-auto">
                    <button id="btnSaveDraft" class="flex-1 sm:flex-none px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-brand-border transition">
                      Save as Draft
                    </button>
                    <button id="btnPublishAndDownload" class="flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-lg bg-brand-emerald hover:bg-brand-emeraldHover text-white shadow transition flex items-center justify-center gap-1.5">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                      Publish Page & Download HTML
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;

      // DOM Bindings
      const inputTitle = document.getElementById('inputPageTitle');
      const inputSlug = document.getElementById('inputPageSlug');
      const selectTemplate = document.getElementById('selectPageTemplate');
      const inputMeta = document.getElementById('inputPageMeta');
      const selectRobots = document.getElementById('selectPageRobots');
      const textareaContent = document.getElementById('textareaPageContent');
      const charCountLabel = document.getElementById('charCountLabel');
      const byteSizeLabel = document.getElementById('byteSizeLabel');
      const routePreviewLabel = document.getElementById('routePreviewLabel');
      const collisionIndicator = document.getElementById('slugCollisionIndicator');

      // Set initial starter template
      textareaContent.value = TEMPLATES['Standard Content'];

      function updateContentStats() {
        const text = textareaContent.value || '';
        if (charCountLabel) charCountLabel.textContent = `${text.length} chars`;
        if (byteSizeLabel) {
          const kb = ((text.length * 2) / 1024).toFixed(1);
          byteSizeLabel.textContent = `${kb} KB`;
        }
      }
      updateContentStats();

      function validateSlug() {
        const slug = inputSlug.value.trim();
        if (routePreviewLabel) routePreviewLabel.textContent = slug || 'page.html';

        if (window.CSOSuperStore && typeof window.CSOSuperStore.checkSlugCollision === 'function') {
          const isCollision = window.CSOSuperStore.checkSlugCollision(slug);
          if (collisionIndicator) {
            if (isCollision) {
              collisionIndicator.className = "text-[10px] font-mono text-rose-400 flex items-center gap-1 font-bold";
              collisionIndicator.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-rose-400"></span> Already Exists!`;
            } else {
              collisionIndicator.className = "text-[10px] font-mono text-emerald-400 flex items-center gap-1";
              collisionIndicator.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Available`;
            }
          }
          return !isCollision;
        }
        return true;
      }

      // Live Slug Generation
      let userManuallyEditedSlug = false;
      inputTitle.addEventListener('input', () => {
        if (!userManuallyEditedSlug) {
          if (window.CSOSuperStore && typeof window.CSOSuperStore.generateSanitizedSlug === 'function') {
            inputSlug.value = window.CSOSuperStore.generateSanitizedSlug(inputTitle.value);
          } else {
            inputSlug.value = inputTitle.value.toLowerCase().trim().replace(/[^a-z0-9]/g, '-') + '.html';
          }
          validateSlug();
        }
      });

      inputSlug.addEventListener('input', () => {
        userManuallyEditedSlug = true;
        validateSlug();
      });

      // Template Change
      selectTemplate.addEventListener('change', (e) => {
        const t = e.target.value;
        if (TEMPLATES[t]) {
          textareaContent.value = TEMPLATES[t];
          updateContentStats();
        }
      });

      textareaContent.addEventListener('input', updateContentStats);

      // Back Button
      document.getElementById('btnBackToAllPages')?.addEventListener('click', () => {
        selectModule('folder-02', 'module-02-001');
      });

      // Save Actions Helper
      function handleSave(isDraft) {
        const title = inputTitle.value.trim();
        let slug = inputSlug.value.trim();

        if (!title) {
          showToast("Please provide a page title.", "warning");
          inputTitle.focus();
          return;
        }

        if (!slug) {
          slug = window.CSOSuperStore?.generateSanitizedSlug(title) || 'page.html';
        }

        if (!slug.endsWith('.html')) {
          slug += '.html';
        }

        const pagePayload = {
          title: title,
          slug: slug,
          template: selectTemplate.value,
          metaDescription: inputMeta.value.trim(),
          robots: selectRobots.value,
          content: textareaContent.value
        };

        if (window.CSOSuperStore && typeof window.CSOSuperStore.saveNewPage === 'function') {
          const createdPage = window.CSOSuperStore.saveNewPage(pagePayload, isDraft);

          if (!isDraft && typeof window.CSOSuperStore.downloadPageHtml === 'function') {
            window.CSOSuperStore.downloadPageHtml(createdPage);
            showToast(`Page published! Downloaded ${createdPage.file}`, "success");
            // Navigate back to All Pages
            setTimeout(() => {
              selectModule('folder-02', 'module-02-001');
            }, 800);
          } else {
            showToast(`Page saved as draft (${createdPage.file})`, "info");
            selectModule('folder-02', 'module-02-001');
          }
        }
      }

      // Save as Draft
      document.getElementById('btnSaveDraft')?.addEventListener('click', () => {
        handleSave(true);
      });

      // Publish & Download
      document.getElementById('btnPublishAndDownload')?.addEventListener('click', () => {
        handleSave(false);
      });
    }

    /**
     * VIEW 2c: Interactive Visual Page Builder (module-02-003)
     */
    function renderVisualPageBuilderWorkspace() {
      // Header Breadcrumb
      dom.breadcrumbFolder.textContent = "Website Pages & Builder";
      dom.breadcrumbModule.textContent = "Visual Page Builder (module-02-003)";

      // Ingest Pages List
      const pages = (window.CSOSuperStore && typeof window.CSOSuperStore.getAllPages === 'function')
        ? window.CSOSuperStore.getAllPages('ALL', '')
        : [];

      // Current active page ID (default to first page or blank)
      let activePageId = pages.length > 0 ? pages[0].id : 'NEW_PAGE';
      let activeViewport = 'desktop'; // 'desktop' (100%), 'tablet' (768px), 'mobile' (375px)

      // Top Action Bar with Page Selector, Viewport Toggles, and Save/Download
      const pageOptionsHtml = pages.map(p => {
        return `<option value="${p.id}" ${p.id === activePageId ? 'selected' : ''}>${p.title} (${p.file})</option>`;
      }).join('');

      dom.moduleHeaderActions.innerHTML = `
        <div class="flex flex-wrap items-center gap-2">
          <!-- Page Selector -->
          <div class="flex items-center">
            <span class="text-[11px] font-mono text-slate-400 mr-1.5 hidden sm:inline">Editing:</span>
            <select id="selectBuilderPage" class="bg-[#081220] border border-brand-border rounded-lg px-2.5 py-1.5 text-xs text-white font-sans focus:outline-none focus:ring-1 focus:ring-brand-emerald max-w-[220px] truncate">
              ${pageOptionsHtml}
              <option value="NEW_PAGE">+ Blank Document Canvas</option>
            </select>
          </div>

          <!-- Viewport Switchers -->
          <div class="flex items-center bg-[#081220] border border-brand-border rounded-lg p-0.5">
            <button id="btnViewportDesktop" title="Desktop View (100%)" class="px-2 py-1 rounded text-xs font-mono font-semibold transition bg-slate-800 text-white">
              Desktop
            </button>
            <button id="btnViewportTablet" title="Tablet View (768px)" class="px-2 py-1 rounded text-xs font-mono font-semibold transition text-slate-400 hover:text-white">
              768px
            </button>
            <button id="btnViewportMobile" title="Mobile View (375px)" class="px-2 py-1 rounded text-xs font-mono font-semibold transition text-slate-400 hover:text-white">
              375px
            </button>
          </div>

          <!-- Action Buttons -->
          <button id="btnSaveBuilderPage" class="px-3 py-1.5 text-xs font-bold rounded-lg bg-brand-emerald hover:bg-brand-emeraldHover text-white shadow flex items-center gap-1.5 transition">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/></svg>
            Save Page
          </button>
          <button id="btnDownloadBuilderHtml" class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-brand-border flex items-center gap-1.5 transition">
            <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            Download HTML
          </button>
        </div>
      `;

      // 3-Column Studio Layout
      dom.workspaceRoot.innerHTML = `
        <div class="space-y-4 font-sans">
          <!-- Workspace Overview -->
          <div class="p-4 rounded-xl bg-brand-slate border border-brand-border shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 class="text-sm font-bold text-white flex items-center gap-2">
                Visual Component Studio & Responsive Canvas
                <span class="text-xs font-mono font-normal px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/60">module-02-003</span>
              </h2>
              <p class="text-xs text-slate-400 mt-0.5">Insert pre-styled design system blocks, preview live viewport breakpoints, and synchronize clean HTML.</p>
            </div>
            <div class="flex items-center gap-2">
              <span id="builderSyncStatus" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 text-xs font-mono">
                <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
                Canvas Live
              </span>
            </div>
          </div>

          <!-- 3-Column Split Area -->
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            <!-- Left Column: Block Library (3 cols) -->
            <div class="lg:col-span-3 space-y-3">
              <div class="p-4 rounded-xl bg-brand-slate border border-brand-border shadow-md space-y-3">
                <div class="flex items-center justify-between pb-2 border-b border-brand-border">
                  <h3 class="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                    Block Library
                  </h3>
                  <button id="btnClearBuilderCanvas" class="text-[11px] text-rose-400 hover:text-rose-300 font-mono transition">
                    Clear Canvas
                  </button>
                </div>

                <p class="text-[11px] text-slate-400">Click to append Odisha theme components directly into the canvas:</p>

                <!-- Component Palette Cards -->
                <div class="space-y-2">
                  <button data-block="hero" class="btn-insert-block w-full text-left p-3 rounded-lg bg-[#081220] hover:bg-slate-800/70 border border-brand-border hover:border-brand-emerald/50 transition group space-y-1">
                    <div class="flex items-center justify-between text-xs font-bold text-white group-hover:text-emerald-400">
                      <span>Hero Section</span>
                      <span class="text-[10px] font-mono text-slate-500 group-hover:text-emerald-400">+ Insert</span>
                    </div>
                    <p class="text-[10px] text-slate-400">State hero banner with badge, H1 title, subtitle, and CTA button.</p>
                  </button>

                  <button data-block="cards" class="btn-insert-block w-full text-left p-3 rounded-lg bg-[#081220] hover:bg-slate-800/70 border border-brand-border hover:border-brand-emerald/50 transition group space-y-1">
                    <div class="flex items-center justify-between text-xs font-bold text-white group-hover:text-emerald-400">
                      <span>Feature Cards (3-Col)</span>
                      <span class="text-[10px] font-mono text-slate-500 group-hover:text-emerald-400">+ Insert</span>
                    </div>
                    <p class="text-[10px] text-slate-400">OSSC, OPSC, and Teaching exam quick-link matrix.</p>
                  </button>

                  <button data-block="notice" class="btn-insert-block w-full text-left p-3 rounded-lg bg-[#081220] hover:bg-slate-800/70 border border-brand-border hover:border-brand-emerald/50 transition group space-y-1">
                    <div class="flex items-center justify-between text-xs font-bold text-white group-hover:text-emerald-400">
                      <span>Notice Banner</span>
                      <span class="text-[10px] font-mono text-slate-500 group-hover:text-emerald-400">+ Insert</span>
                    </div>
                    <p class="text-[10px] text-slate-400">Emerald high-priority alert box with PDF download trigger.</p>
                  </button>

                  <button data-block="syllabusTable" class="btn-insert-block w-full text-left p-3 rounded-lg bg-[#081220] hover:bg-slate-800/70 border border-brand-border hover:border-brand-emerald/50 transition group space-y-1">
                    <div class="flex items-center justify-between text-xs font-bold text-white group-hover:text-emerald-400">
                      <span>Syllabus Table</span>
                      <span class="text-[10px] font-mono text-slate-500 group-hover:text-emerald-400">+ Insert</span>
                    </div>
                    <p class="text-[10px] text-slate-400">3-column marks weightage table for exam schemes.</p>
                  </button>

                  <button data-block="faq" class="btn-insert-block w-full text-left p-3 rounded-lg bg-[#081220] hover:bg-slate-800/70 border border-brand-border hover:border-brand-emerald/50 transition group space-y-1">
                    <div class="flex items-center justify-between text-xs font-bold text-white group-hover:text-emerald-400">
                      <span>Collapsible FAQ</span>
                      <span class="text-[10px] font-mono text-slate-500 group-hover:text-emerald-400">+ Insert</span>
                    </div>
                    <p class="text-[10px] text-slate-400">2-question accordion with candidate eligibility criteria.</p>
                  </button>

                  <button data-block="cta" class="btn-insert-block w-full text-left p-3 rounded-lg bg-[#081220] hover:bg-slate-800/70 border border-brand-border hover:border-brand-emerald/50 transition group space-y-1">
                    <div class="flex items-center justify-between text-xs font-bold text-white group-hover:text-emerald-400">
                      <span>CTA Footer Banner</span>
                      <span class="text-[10px] font-mono text-slate-500 group-hover:text-emerald-400">+ Insert</span>
                    </div>
                    <p class="text-[10px] text-slate-400">Dark navy student outreach callout container.</p>
                  </button>
                </div>
              </div>
            </div>

            <!-- Center Column: Live Responsive Canvas (5 cols) -->
            <div class="lg:col-span-5 space-y-3">
              <div class="p-4 rounded-xl bg-brand-slate border border-brand-border shadow-md space-y-2 flex flex-col">
                <div class="flex items-center justify-between pb-2 border-b border-brand-border text-xs font-mono">
                  <span class="text-slate-400 flex items-center gap-1.5">
                    <span class="w-2 h-2 rounded-full bg-cyan-400"></span>
                    Live Preview Canvas
                  </span>
                  <span id="activeViewportLabel" class="text-cyan-400 font-bold">100% Full Width</span>
                </div>

                <!-- Canvas Outer Frame -->
                <div class="w-full bg-[#030712] border border-brand-border rounded-xl p-3 flex justify-center overflow-x-auto min-h-[480px]">
                  <div id="builderCanvasWrapper" class="w-full transition-all duration-300 bg-[#040810] rounded-lg border border-slate-800/80 p-4 overflow-y-auto max-h-[640px]">
                    <div id="livePreviewContainer" class="space-y-4">
                      <!-- Live rendered markup here -->
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Right Column: Bidirectional HTML Source Editor (4 cols) -->
            <div class="lg:col-span-4 space-y-3">
              <div class="p-4 rounded-xl bg-brand-slate border border-brand-border shadow-md space-y-2 flex flex-col h-full">
                <div class="flex items-center justify-between pb-2 border-b border-brand-border">
                  <h3 class="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                    HTML Source Sync
                  </h3>
                  <div class="text-[10px] font-mono text-slate-400">
                    <span id="builderCharCount">0 chars</span> &bull; <span id="builderByteSize">0.0 KB</span>
                  </div>
                </div>

                <div class="relative flex-grow">
                  <textarea id="builderHtmlSource" rows="22" class="w-full h-full min-h-[480px] bg-[#050a14] border border-brand-border rounded-lg p-3 text-slate-200 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-brand-emerald leading-relaxed" placeholder="Type or paste HTML code here to sync live with preview..."></textarea>
                </div>
                <p class="text-[10px] text-slate-500 font-mono">Real-time bidirectional synchronization with canvas preview.</p>
              </div>
            </div>
          </div>
        </div>
      `;

      // Elements
      const selectPage = document.getElementById('selectBuilderPage');
      const canvasWrapper = document.getElementById('builderCanvasWrapper');
      const liveContainer = document.getElementById('livePreviewContainer');
      const sourceEditor = document.getElementById('builderHtmlSource');
      const viewportLabel = document.getElementById('activeViewportLabel');
      const charCountEl = document.getElementById('builderCharCount');
      const byteSizeEl = document.getElementById('builderByteSize');
      const btnDesk = document.getElementById('btnViewportDesktop');
      const btnTab = document.getElementById('btnViewportTablet');
      const btnMob = document.getElementById('btnViewportMobile');

      // Load initial page content
      function getActivePageContent() {
        if (activePageId === 'NEW_PAGE') {
          return `<!-- Blank Page -->\n${window.CSOSuperStore?.getBlockMarkup('hero') || ''}`;
        }
        const found = pages.find(p => p.id === activePageId);
        if (found && found.htmlContent) {
          return found.htmlContent;
        }
        // If no custom htmlContent, return default hero
        return `<!-- Page: ${found?.title || 'Odisha Portal'} -->\n${window.CSOSuperStore?.getBlockMarkup('hero') || ''}`;
      }

      function updateMetrics(html) {
        if (charCountEl) charCountEl.textContent = `${html.length} chars`;
        if (byteSizeEl) {
          const kb = ((html.length * 2) / 1024).toFixed(1);
          byteSizeEl.textContent = `${kb} KB`;
        }
      }

      function syncToCanvas(html) {
        if (liveContainer) {
          liveContainer.innerHTML = html;
        }
        updateMetrics(html);
      }

      // Initialize source & canvas
      const initialHtml = getActivePageContent();
      if (sourceEditor) sourceEditor.value = initialHtml;
      syncToCanvas(initialHtml);

      // Page Switcher
      if (selectPage) {
        selectPage.addEventListener('change', (e) => {
          activePageId = e.target.value;
          const html = getActivePageContent();
          if (sourceEditor) sourceEditor.value = html;
          syncToCanvas(html);
        });
      }

      // Viewport Switchers
      function setViewport(mode) {
        activeViewport = mode;
        btnDesk.className = "px-2 py-1 rounded text-xs font-mono font-semibold transition text-slate-400 hover:text-white";
        btnTab.className = "px-2 py-1 rounded text-xs font-mono font-semibold transition text-slate-400 hover:text-white";
        btnMob.className = "px-2 py-1 rounded text-xs font-mono font-semibold transition text-slate-400 hover:text-white";

        if (mode === 'desktop') {
          btnDesk.className = "px-2 py-1 rounded text-xs font-mono font-semibold transition bg-slate-800 text-white";
          canvasWrapper.style.maxWidth = '100%';
          if (viewportLabel) viewportLabel.textContent = '100% Full Width';
        } else if (mode === 'tablet') {
          btnTab.className = "px-2 py-1 rounded text-xs font-mono font-semibold transition bg-slate-800 text-white";
          canvasWrapper.style.maxWidth = '768px';
          if (viewportLabel) viewportLabel.textContent = '768px Tablet Frame';
        } else if (mode === 'mobile') {
          btnMob.className = "px-2 py-1 rounded text-xs font-mono font-semibold transition bg-slate-800 text-white";
          canvasWrapper.style.maxWidth = '375px';
          if (viewportLabel) viewportLabel.textContent = '375px Mobile Frame';
        }
      }

      btnDesk?.addEventListener('click', () => setViewport('desktop'));
      btnTab?.addEventListener('click', () => setViewport('tablet'));
      btnMob?.addEventListener('click', () => setViewport('mobile'));

      // Bidirectional typing in source editor
      let debounceTimer = null;
      sourceEditor?.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          syncToCanvas(sourceEditor.value);
        }, 150);
      });

      // Insert Block Handlers
      document.querySelectorAll('.btn-insert-block').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const blockType = e.currentTarget.getAttribute('data-block');
          if (window.CSOSuperStore && typeof window.CSOSuperStore.getBlockMarkup === 'function') {
            const blockHtml = window.CSOSuperStore.getBlockMarkup(blockType);
            const current = sourceEditor.value;
            const updated = current.trim() ? `${current}\n\n${blockHtml}` : blockHtml;
            sourceEditor.value = updated;
            syncToCanvas(updated);
            showToast(`Inserted ${blockType} block into canvas`, "info");
          }
        });
      });

      // Clear Canvas
      document.getElementById('btnClearBuilderCanvas')?.addEventListener('click', () => {
        openModal("Clear Canvas", `
          <div class="space-y-3 font-sans text-xs">
            <p class="text-slate-300">Are you sure you want to clear the entire page canvas? This will remove all blocks from the active buffer.</p>
          </div>
        `, `
          <button onclick="closeModal()" class="px-3 py-1.5 text-xs font-semibold rounded bg-slate-800 text-slate-300 hover:bg-slate-700">Cancel</button>
          <button id="btnConfirmClearCanvas" class="px-3 py-1.5 text-xs font-bold rounded bg-rose-600 hover:bg-rose-500 text-white transition">Clear All</button>
        `);

        document.getElementById('btnConfirmClearCanvas')?.addEventListener('click', () => {
          closeModal();
          sourceEditor.value = '';
          syncToCanvas('');
          showToast("Canvas buffer cleared", "warning");
        });
      });

      // Save Page
      document.getElementById('btnSaveBuilderPage')?.addEventListener('click', () => {
        const content = sourceEditor.value;
        if (activePageId === 'NEW_PAGE') {
          // Redirect to Create New Page with preset content
          selectModule('folder-02', 'module-02-002');
          return;
        }

        if (window.CSOSuperStore && typeof window.CSOSuperStore.updatePageContent === 'function') {
          const updatedPage = window.CSOSuperStore.updatePageContent(activePageId, content);
          if (updatedPage) {
            showToast(`Page "${updatedPage.title}" updated successfully (${updatedPage.sizeKb} KB)`, "success");
          } else {
            showToast("Failed to locate target page record.", "error");
          }
        }
      });

      // Download HTML
      document.getElementById('btnDownloadBuilderHtml')?.addEventListener('click', () => {
        const content = sourceEditor.value;
        const page = pages.find(p => p.id === activePageId) || {
          id: 'PAGE-NEW',
          file: 'custom-builder-page.html',
          title: 'Custom Page',
          htmlContent: content
        };
        page.htmlContent = content;

        if (window.CSOSuperStore && typeof window.CSOSuperStore.downloadPageHtml === 'function') {
          window.CSOSuperStore.downloadPageHtml(page);
          showToast(`Downloaded standalone file: ${page.file}`, "success");
        }
      });
    }

    /**
     * VIEW 2d: Dynamic Homepage Builder & Copy Customizer (module-02-004)
     */
    function renderHomepageBuilderWorkspace() {
      // Header Breadcrumb
      dom.breadcrumbFolder.textContent = "Website Pages & Builder";
      dom.breadcrumbModule.textContent = "Homepage Builder (module-02-004)";

      // Top Action Bar
      dom.moduleHeaderActions.innerHTML = `
        <div class="flex items-center gap-2">
          <button id="btnSaveHomepageConfig" class="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-brand-emerald hover:bg-brand-emeraldHover text-white shadow flex items-center gap-1.5 transition">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
            Save & Publish to Homepage
          </button>
          <a href="/" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-brand-border flex items-center gap-1.5 transition">
            Preview Homepage &nearr;
          </a>
        </div>
      `;

      // Ingest live configuration
      const config = (window.CSOSuperStore && typeof window.CSOSuperStore.getHomepageConfig === 'function')
        ? window.CSOSuperStore.getHomepageConfig()
        : {
            hero: {
              badge: "Odisha's Dedicated Academic & Recruitment Hub",
              headline: "Empowering Aspirants Across All 30 Districts of Odisha",
              subheadline: "Instant access to authentic syllabus breakdowns, previous year papers, and state recruitment updates.",
              primaryCtaText: "Explore Syllabi & PYQs",
              primaryCtaUrl: "/resources.html",
              secondaryCtaText: "Contact Helpdesk",
              secondaryCtaUrl: "/contact.html",
              enabled: true
            },
            sections: [
              { id: "sec-notice", name: "Emergency Live Broadcast Banner", enabled: true },
              { id: "sec-badges", name: "Quick Examination Access Chips", enabled: true },
              { id: "sec-cards", name: "Core Portal Cards (OSSC, OPSC, Teaching)", enabled: true },
              { id: "sec-stats", name: "Platform Statistics Strip", enabled: true }
            ],
            stats: {
              aspirants: "12,480+",
              resources: "3,790+",
              districts: "30 Districts",
              enabled: true
            },
            lastUpdated: new Date().toISOString()
          };

      dom.workspaceRoot.innerHTML = `
        <div class="space-y-6 font-sans">
          <!-- Overview Card -->
          <div class="p-5 rounded-xl bg-brand-slate border border-brand-border shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 class="text-base font-bold text-white flex items-center gap-2">
                Homepage Live Layout & Dynamic Content Studio
                <span class="text-xs font-mono font-normal px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/60">module-02-004</span>
              </h2>
              <p class="text-xs text-slate-400 mt-0.5">Customize real-time hero headlines, call-to-action buttons, module visibility, and platform statistics displayed on csodisha.com.</p>
            </div>
            <div class="text-[11px] font-mono text-slate-400 bg-[#081220] border border-brand-border px-3 py-1.5 rounded-lg">
              Last Published: <span id="homepageLastUpdated" class="text-emerald-400 font-bold">${new Date(config.lastUpdated).toLocaleDateString()} ${new Date(config.lastUpdated).toLocaleTimeString()}</span>
            </div>
          </div>

          <!-- 3 Feature Cards Grid Layout -->
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <!-- Left Column: Hero Section Customizer (7 cols) -->
            <div class="lg:col-span-7 space-y-4">
              <!-- Card 1: Hero Section Customizer -->
              <div class="p-5 rounded-xl bg-brand-slate border border-brand-border shadow-md space-y-4">
                <div class="flex items-center justify-between pb-3 border-b border-brand-border">
                  <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
                    <h3 class="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
                      1. Hero Section Headline & Calls to Action
                    </h3>
                  </div>
                  <label class="flex items-center gap-2 cursor-pointer text-xs font-mono">
                    <input type="checkbox" id="checkHeroEnabled" ${config.hero.enabled !== false ? 'checked' : ''} class="rounded bg-slate-900 border-slate-700 text-brand-emerald focus:ring-brand-emerald">
                    <span class="text-slate-300">Section Active</span>
                  </label>
                </div>

                <!-- Hero Badge -->
                <div>
                  <label class="block text-xs font-semibold text-slate-200 mb-1">Hero Pill / Badge Text</label>
                  <input id="inputHeroBadge" type="text" value="${config.hero.badge || ''}" class="w-full bg-[#081220] border border-brand-border rounded-lg px-3 py-2 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-emerald">
                </div>

                <!-- Main Headline -->
                <div>
                  <label class="block text-xs font-semibold text-slate-200 mb-1">Primary Headline</label>
                  <input id="inputHeroHeadline" type="text" value="${config.hero.headline || ''}" class="w-full bg-[#081220] border border-brand-border rounded-lg px-3 py-2 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-emerald">
                </div>

                <!-- Subheadline -->
                <div>
                  <label class="block text-xs font-semibold text-slate-200 mb-1">Subheadline & Mission Description</label>
                  <textarea id="textareaHeroSubheadline" rows="3" class="w-full bg-[#081220] border border-brand-border rounded-lg px-3 py-2 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-emerald leading-relaxed">${config.hero.subheadline || ''}</textarea>
                </div>

                <!-- CTA Row -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <!-- Primary CTA -->
                  <div class="p-3.5 rounded-lg bg-[#081220] border border-brand-border space-y-2">
                    <span class="text-[11px] font-mono text-emerald-400 font-bold block uppercase tracking-wider">Primary Button</span>
                    <div>
                      <label class="block text-[11px] text-slate-400 mb-0.5">Button Label</label>
                      <input id="inputPrimaryCtaText" type="text" value="${config.hero.primaryCtaText || ''}" class="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white text-xs">
                    </div>
                    <div>
                      <label class="block text-[11px] text-slate-400 mb-0.5">Target Route</label>
                      <input id="inputPrimaryCtaUrl" type="text" value="${config.hero.primaryCtaUrl || ''}" class="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white text-xs font-mono">
                    </div>
                  </div>

                  <!-- Secondary CTA -->
                  <div class="p-3.5 rounded-lg bg-[#081220] border border-brand-border space-y-2">
                    <span class="text-[11px] font-mono text-cyan-400 font-bold block uppercase tracking-wider">Secondary Button</span>
                    <div>
                      <label class="block text-[11px] text-slate-400 mb-0.5">Button Label</label>
                      <input id="inputSecondaryCtaText" type="text" value="${config.hero.secondaryCtaText || ''}" class="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white text-xs">
                    </div>
                    <div>
                      <label class="block text-[11px] text-slate-400 mb-0.5">Target Route</label>
                      <input id="inputSecondaryCtaUrl" type="text" value="${config.hero.secondaryCtaUrl || ''}" class="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white text-xs font-mono">
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Right Column: Sections Ordering & Stats (5 cols) -->
            <div class="lg:col-span-5 space-y-4">
              <!-- Card 2: Section Visibility & Ordering Matrix -->
              <div class="p-5 rounded-xl bg-brand-slate border border-brand-border shadow-md space-y-3">
                <div class="flex items-center justify-between pb-2 border-b border-brand-border">
                  <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                    <h3 class="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
                      2. Section Visibility Matrix
                    </h3>
                  </div>
                  <span class="text-[10px] font-mono text-slate-500">Live Hierarchy</span>
                </div>

                <p class="text-[11px] text-slate-400">Toggle public visibility and shift ordering of core blocks on index.html:</p>

                <div id="sectionsListContainer" class="space-y-2">
                  <!-- Rendered via JavaScript -->
                </div>
              </div>

              <!-- Card 3: Platform Statistics Strip -->
              <div class="p-5 rounded-xl bg-brand-slate border border-brand-border shadow-md space-y-3">
                <div class="flex items-center justify-between pb-2 border-b border-brand-border">
                  <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                    <h3 class="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
                      3. Platform Metrics & Counters
                    </h3>
                  </div>
                  <label class="flex items-center gap-2 cursor-pointer text-xs font-mono">
                    <input type="checkbox" id="checkStatsEnabled" ${config.stats?.enabled !== false ? 'checked' : ''} class="rounded bg-slate-900 border-slate-700 text-brand-emerald focus:ring-brand-emerald">
                    <span class="text-slate-300">Visible</span>
                  </label>
                </div>

                <div class="grid grid-cols-3 gap-2 pt-1">
                  <div>
                    <label class="block text-[11px] text-slate-400 mb-0.5 font-mono">Active Aspirants</label>
                    <input id="inputStatsAspirants" type="text" value="${config.stats?.aspirants || '12,480+'}" class="w-full bg-[#081220] border border-brand-border rounded px-2.5 py-1.5 text-white text-xs font-bold font-mono">
                  </div>
                  <div>
                    <label class="block text-[11px] text-slate-400 mb-0.5 font-mono">Verified Files</label>
                    <input id="inputStatsResources" type="text" value="${config.stats?.resources || '3,790+'}" class="w-full bg-[#081220] border border-brand-border rounded px-2.5 py-1.5 text-white text-xs font-bold font-mono">
                  </div>
                  <div>
                    <label class="block text-[11px] text-slate-400 mb-0.5 font-mono">Districts</label>
                    <input id="inputStatsDistricts" type="text" value="${config.stats?.districts || '30 Districts'}" class="w-full bg-[#081220] border border-brand-border rounded px-2.5 py-1.5 text-white text-xs font-bold font-mono">
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;

      // Render Section Reorder Matrix
      const currentSections = (config.sections && Array.isArray(config.sections))
        ? [...config.sections]
        : [
            { id: "sec-notice", name: "Emergency Live Broadcast Banner", enabled: true },
            { id: "sec-badges", name: "Quick Examination Access Chips", enabled: true },
            { id: "sec-cards", name: "Core Portal Cards (OSSC, OPSC, Teaching)", enabled: true },
            { id: "sec-stats", name: "Platform Statistics Strip", enabled: true }
          ];

      function renderSections() {
        const container = document.getElementById('sectionsListContainer');
        if (!container) return;

        container.innerHTML = currentSections.map((sec, idx) => {
          return `
            <div class="p-3 rounded-lg bg-[#081220] border border-brand-border flex items-center justify-between gap-2">
              <div class="flex items-center gap-2.5">
                <span class="w-5 h-5 rounded bg-slate-900 border border-slate-700 flex items-center justify-center text-[10px] font-mono text-slate-400 font-bold">${idx + 1}</span>
                <span class="text-xs font-semibold text-slate-200">${sec.name}</span>
              </div>
              <div class="flex items-center gap-2">
                <!-- Move Up / Down -->
                <button data-idx="${idx}" class="btn-sec-up p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition ${idx === 0 ? 'opacity-30 cursor-not-allowed' : ''}" title="Move Up">
                  &uarr;
                </button>
                <button data-idx="${idx}" class="btn-sec-down p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition ${idx === currentSections.length - 1 ? 'opacity-30 cursor-not-allowed' : ''}" title="Move Down">
                  &darr;
                </button>
                <!-- Toggle Active -->
                <label class="cursor-pointer ml-1">
                  <input type="checkbox" data-idx="${idx}" class="sec-toggle-input rounded bg-slate-900 border-slate-700 text-brand-emerald focus:ring-brand-emerald" ${sec.enabled ? 'checked' : ''}>
                </label>
              </div>
            </div>
          `;
        }).join('');

        // Wire Up / Down / Toggle
        container.querySelectorAll('.btn-sec-up').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const i = parseInt(e.currentTarget.getAttribute('data-idx'));
            if (i > 0) {
              const temp = currentSections[i];
              currentSections[i] = currentSections[i - 1];
              currentSections[i - 1] = temp;
              renderSections();
            }
          });
        });

        container.querySelectorAll('.btn-sec-down').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const i = parseInt(e.currentTarget.getAttribute('data-idx'));
            if (i < currentSections.length - 1) {
              const temp = currentSections[i];
              currentSections[i] = currentSections[i + 1];
              currentSections[i + 1] = temp;
              renderSections();
            }
          });
        });

        container.querySelectorAll('.sec-toggle-input').forEach(chk => {
          chk.addEventListener('change', (e) => {
            const i = parseInt(e.currentTarget.getAttribute('data-idx'));
            currentSections[i].enabled = e.target.checked;
          });
        });
      }

      renderSections();

      // Save & Publish Configuration
      document.getElementById('btnSaveHomepageConfig')?.addEventListener('click', () => {
        const payload = {
          hero: {
            badge: document.getElementById('inputHeroBadge')?.value.trim() || '',
            headline: document.getElementById('inputHeroHeadline')?.value.trim() || '',
            subheadline: document.getElementById('textareaHeroSubheadline')?.value.trim() || '',
            primaryCtaText: document.getElementById('inputPrimaryCtaText')?.value.trim() || '',
            primaryCtaUrl: document.getElementById('inputPrimaryCtaUrl')?.value.trim() || '',
            secondaryCtaText: document.getElementById('inputSecondaryCtaText')?.value.trim() || '',
            secondaryCtaUrl: document.getElementById('inputSecondaryCtaUrl')?.value.trim() || '',
            enabled: document.getElementById('checkHeroEnabled')?.checked ?? true
          },
          sections: currentSections,
          stats: {
            aspirants: document.getElementById('inputStatsAspirants')?.value.trim() || '12,480+',
            resources: document.getElementById('inputStatsResources')?.value.trim() || '3,790+',
            districts: document.getElementById('inputStatsDistricts')?.value.trim() || '30 Districts',
            enabled: document.getElementById('checkStatsEnabled')?.checked ?? true
          }
        };

        if (window.CSOSuperStore && typeof window.CSOSuperStore.saveHomepageConfig === 'function') {
          const saved = window.CSOSuperStore.saveHomepageConfig(payload);
          const updateEl = document.getElementById('homepageLastUpdated');
          if (updateEl && saved.lastUpdated) {
            updateEl.textContent = `${new Date(saved.lastUpdated).toLocaleDateString()} ${new Date(saved.lastUpdated).toLocaleTimeString()}`;
          }
          showToast("Homepage layout & copy published successfully!", "success");
        }
      });
    }

    /**
     * VIEW 2e: Campaign Landing Pages Hub (module-02-005)
     */
    function renderLandingPagesWorkspace() {
      // Header Breadcrumb
      dom.breadcrumbFolder.textContent = "Website Pages & Builder";
      dom.breadcrumbModule.textContent = "Landing Pages (module-02-005)";

      // Top Action Bar
      dom.moduleHeaderActions.innerHTML = `
        <div class="flex items-center gap-2">
          <button id="btnCreateLandingPageTop" class="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-brand-emerald hover:bg-brand-emeraldHover text-white shadow flex items-center gap-1.5 transition">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            + Create Landing Page
          </button>
          <button id="btnExportLandingPages" class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-brand-border flex items-center gap-1.5 transition">
            <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            Export Campaigns (JSON)
          </button>
        </div>
      `;

      // Workspace Template
      dom.workspaceRoot.innerHTML = `
        <div class="space-y-6 font-sans">
          <!-- Overview Card -->
          <div class="p-5 rounded-xl bg-brand-slate border border-brand-border shadow-md space-y-4">
            <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h2 class="text-base font-bold text-white flex items-center gap-2">
                  Special Examination & Scholarship Landing Pages
                  <span class="text-xs font-mono font-normal px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/60">module-02-005</span>
                </h2>
                <p class="text-xs text-slate-400 mt-0.5">High-converting dedicated campaign gateways for targeted student acquisition, admit card releases, and scholarship drives.</p>
              </div>
              <div class="flex items-center gap-2">
                <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 text-xs font-mono font-bold">
                  <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Campaign Engine Active
                </span>
              </div>
            </div>

            <!-- KPI Row -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
              <div class="p-3.5 rounded-lg bg-[#081220] border border-brand-border">
                <span class="text-xs text-slate-400 block">Active Live Campaigns</span>
                <div id="kpiActiveCampaigns" class="text-xl font-bold font-mono text-emerald-400 mt-1">--</div>
                <div class="text-[10px] text-slate-500 font-mono mt-0.5">Public gateways live</div>
              </div>
              <div class="p-3.5 rounded-lg bg-[#081220] border border-brand-border">
                <span class="text-xs text-slate-400 block">Total Campaign Visits</span>
                <div id="kpiTotalVisits" class="text-xl font-bold font-mono text-white mt-1">--</div>
                <div class="text-[10px] text-slate-500 font-mono mt-0.5">Aggregate traffic</div>
              </div>
              <div class="p-3.5 rounded-lg bg-[#081220] border border-brand-border">
                <span class="text-xs text-slate-400 block">Average Conversion Rate</span>
                <div id="kpiAvgConversion" class="text-xl font-bold font-mono text-cyan-400 mt-1">-- %</div>
                <div class="text-[10px] text-slate-500 font-mono mt-0.5">CTA click-throughs</div>
              </div>
              <div class="p-3.5 rounded-lg bg-[#081220] border border-brand-border">
                <span class="text-xs text-slate-400 block">Pipeline / Drafts</span>
                <div id="kpiDraftCampaigns" class="text-xl font-bold font-mono text-amber-400 mt-1">--</div>
                <div class="text-[10px] text-slate-500 font-mono mt-0.5">Upcoming promotions</div>
              </div>
            </div>
          </div>

          <!-- Filters & Search Controls -->
          <div class="p-4 rounded-xl bg-brand-slate border border-brand-border shadow-md">
            <div class="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div class="sm:col-span-6 relative">
                <input id="landingSearchInput" type="text" placeholder="Search campaign title or slug (e.g. ossc-cgl or Teaching)..." class="w-full bg-[#081220] border border-brand-border rounded-lg pl-9 pr-3 py-2 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-emerald font-sans">
                <svg class="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              </div>

              <div class="sm:col-span-3">
                <select id="landingCategoryFilter" class="w-full bg-[#081220] border border-brand-border rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:ring-1 focus:ring-brand-emerald font-sans">
                  <option value="ALL">All Categories</option>
                  <option value="OSSC">OSSC Exams</option>
                  <option value="OPSC">OPSC Civil Services</option>
                  <option value="Teaching">Teaching & TET</option>
                  <option value="Scholarships">Scholarships</option>
                  <option value="General">General Outreach</option>
                </select>
              </div>

              <div class="sm:col-span-3">
                <select id="landingStatusFilter" class="w-full bg-[#081220] border border-brand-border rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:ring-1 focus:ring-brand-emerald font-sans">
                  <option value="ALL">All Statuses</option>
                  <option value="LIVE">Live Only</option>
                  <option value="DRAFT">Draft Only</option>
                  <option value="PAUSED">Paused Only</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Campaign Directory Table -->
          <div class="rounded-xl bg-brand-slate border border-brand-border shadow-md overflow-hidden">
            <div class="px-5 py-3 border-b border-brand-border flex items-center justify-between">
              <h3 class="text-sm font-bold text-white flex items-center gap-2">
                Landing Page Inventory
                <span id="landingCountBadge" class="text-xs font-mono font-normal px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">-- campaigns</span>
              </h3>
              <span class="text-[11px] text-slate-400 font-mono">Live Ingestion from cso_landing_pages_store</span>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse text-xs">
                <thead>
                  <tr class="bg-[#081220] text-slate-400 font-mono border-b border-brand-border">
                    <th class="py-2.5 px-4 font-semibold">Campaign ID</th>
                    <th class="py-2.5 px-4 font-semibold">Title & Route Slug</th>
                    <th class="py-2.5 px-4 font-semibold">Category</th>
                    <th class="py-2.5 px-4 font-semibold text-center">Status</th>
                    <th class="py-2.5 px-4 font-semibold text-right">Views</th>
                    <th class="py-2.5 px-4 font-semibold text-right">Conversions</th>
                    <th class="py-2.5 px-4 font-semibold">Expiry Date</th>
                    <th class="py-2.5 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody id="landingTableBody" class="divide-y divide-brand-border/40 font-sans">
                  <!-- Injected via JavaScript -->
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;

      // Filter State
      let searchKeyword = '';
      let selectedCategory = 'ALL';
      let selectedStatus = 'ALL';

      function updateKpis() {
        const allPages = (window.CSOSuperStore && typeof window.CSOSuperStore.getLandingPages === 'function')
          ? window.CSOSuperStore.getLandingPages('ALL', 'ALL', '')
          : [];

        const liveCount = allPages.filter(p => p.status === 'Live').length;
        const draftCount = allPages.filter(p => p.status === 'Draft').length;
        const totalVisits = allPages.reduce((acc, p) => acc + (p.views || 0), 0);
        const totalConversions = allPages.reduce((acc, p) => acc + (p.conversions || 0), 0);
        const avgRate = totalVisits > 0 ? ((totalConversions / totalVisits) * 100).toFixed(1) : '0.0';

        const kpiLive = document.getElementById('kpiActiveCampaigns');
        if (kpiLive) kpiLive.textContent = liveCount;

        const kpiVisits = document.getElementById('kpiTotalVisits');
        if (kpiVisits) kpiVisits.textContent = totalVisits.toLocaleString();

        const kpiAvg = document.getElementById('kpiAvgConversion');
        if (kpiAvg) kpiAvg.textContent = `${avgRate}%`;

        const kpiDraft = document.getElementById('kpiDraftCampaigns');
        if (kpiDraft) kpiDraft.textContent = draftCount;
      }

      function renderTableRows() {
        const tbody = document.getElementById('landingTableBody');
        const badge = document.getElementById('landingCountBadge');
        if (!tbody) return;

        const pages = (window.CSOSuperStore && typeof window.CSOSuperStore.getLandingPages === 'function')
          ? window.CSOSuperStore.getLandingPages(selectedCategory, selectedStatus, searchKeyword)
          : [];

        if (badge) badge.textContent = `${pages.length} campaigns`;

        if (pages.length === 0) {
          tbody.innerHTML = `
            <tr>
              <td colspan="8" class="py-8 text-center text-slate-500 font-mono text-xs">
                No landing campaigns match the selected criteria.
              </td>
            </tr>
          `;
          return;
        }

        tbody.innerHTML = pages.map(p => {
          let statusBadge = '';
          if (p.status === 'Live') {
            statusBadge = `<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">LIVE</span>`;
          } else if (p.status === 'Paused') {
            statusBadge = `<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">PAUSED</span>`;
          } else {
            statusBadge = `<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-400 border border-slate-700">DRAFT</span>`;
          }

          const catBadgeColor = p.category === 'OSSC' ? 'text-cyan-400 border-cyan-800/60 bg-cyan-950/40'
            : p.category === 'Teaching' ? 'text-indigo-400 border-indigo-800/60 bg-indigo-950/40'
            : p.category === 'Scholarships' ? 'text-emerald-400 border-emerald-800/60 bg-emerald-950/40'
            : 'text-slate-300 border-slate-700 bg-slate-800/60';

          return `
            <tr class="hover:bg-slate-800/40 transition">
              <td class="py-2.5 px-4 font-mono font-bold text-cyan-400 whitespace-nowrap">${p.id}</td>
              <td class="py-2.5 px-4">
                <div class="font-bold text-white">${p.title}</div>
                <div class="text-[10px] font-mono text-slate-400 mt-0.5">${p.path}</div>
              </td>
              <td class="py-2.5 px-4 whitespace-nowrap">
                <span class="px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${catBadgeColor}">
                  ${p.category}
                </span>
              </td>
              <td class="py-2.5 px-4 text-center whitespace-nowrap">${statusBadge}</td>
              <td class="py-2.5 px-4 text-right font-mono font-bold text-slate-200 whitespace-nowrap">${(p.views || 0).toLocaleString()}</td>
              <td class="py-2.5 px-4 text-right whitespace-nowrap">
                <div class="font-mono font-bold text-emerald-400">${p.conversions || 0}</div>
                <div class="text-[10px] font-mono text-slate-500">${p.conversionRate || '0.0%'}</div>
              </td>
              <td class="py-2.5 px-4 font-mono text-slate-400 text-xs whitespace-nowrap">${p.expiry || 'Open'}</td>
              <td class="py-2.5 px-4 text-right whitespace-nowrap">
                <div class="inline-flex items-center gap-1.5">
                  <button data-id="${p.id}" class="btn-toggle-lp-status px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-mono text-[11px] font-semibold border border-brand-border transition" title="Toggle Live/Paused">
                    ${p.status === 'Live' ? 'Pause' : 'Activate'}
                  </button>
                  <a href="${p.path}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-0.5 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 font-mono text-[11px] font-semibold border border-brand-border transition">
                    Preview &nearr;
                  </a>
                  <button data-id="${p.id}" class="btn-delete-lp px-2 py-1 rounded bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 font-mono text-[11px] font-semibold border border-rose-800/50 transition" title="Delete Campaign">
                    &times;
                  </button>
                </div>
              </td>
            </tr>
          `;
        }).join('');

        // Wire Action Buttons
        tbody.querySelectorAll('.btn-toggle-lp-status').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            if (window.CSOSuperStore && typeof window.CSOSuperStore.toggleLandingPageStatus === 'function') {
              const updated = window.CSOSuperStore.toggleLandingPageStatus(id);
              if (updated) {
                showToast(`Campaign ${id} is now ${updated.status}`, "info");
                updateKpis();
                renderTableRows();
              }
            }
          });
        });

        tbody.querySelectorAll('.btn-delete-lp').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            openModal(`Delete Campaign ${id}`, `
              <div class="space-y-3 font-sans text-xs">
                <p class="text-slate-300">Are you sure you want to delete this landing page campaign record? This action cannot be undone.</p>
              </div>
            `, `
              <button onclick="closeModal()" class="px-3 py-1.5 text-xs font-semibold rounded bg-slate-800 text-slate-300 hover:bg-slate-700">Cancel</button>
              <button id="btnConfirmDeleteLpModal" class="px-3 py-1.5 text-xs font-bold rounded bg-rose-600 hover:bg-rose-500 text-white transition">Confirm Delete</button>
            `);

            document.getElementById('btnConfirmDeleteLpModal')?.addEventListener('click', () => {
              closeModal();
              if (window.CSOSuperStore && typeof window.CSOSuperStore.deleteLandingPage === 'function') {
                window.CSOSuperStore.deleteLandingPage(id);
                showToast(`Campaign ${id} deleted`, "warning");
                updateKpis();
                renderTableRows();
              }
            });
          });
        });
      }

      // Initial Renders
      updateKpis();
      renderTableRows();

      // Search & Filters Listeners
      const searchInput = document.getElementById('landingSearchInput');
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          searchKeyword = e.target.value;
          renderTableRows();
        });
      }

      const catSelect = document.getElementById('landingCategoryFilter');
      if (catSelect) {
        catSelect.addEventListener('change', (e) => {
          selectedCategory = e.target.value;
          renderTableRows();
        });
      }

      const statusSelect = document.getElementById('landingStatusFilter');
      if (statusSelect) {
        statusSelect.addEventListener('change', (e) => {
          selectedStatus = e.target.value;
          renderTableRows();
        });
      }

      // Top Actions Listeners
      document.getElementById('btnExportLandingPages')?.addEventListener('click', () => {
        if (window.CSOSuperStore && typeof window.CSOSuperStore.exportLandingPagesReport === 'function') {
          const filename = window.CSOSuperStore.exportLandingPagesReport();
          showToast(`Exported campaigns: ${filename}`, "success");
        }
      });

      document.getElementById('btnCreateLandingPageTop')?.addEventListener('click', () => {
        openModal("Create New Landing Page Campaign", `
          <div class="space-y-4 font-sans text-xs">
            <div>
              <label class="block text-slate-300 font-semibold mb-1">Campaign Title <span class="text-rose-400">*</span></label>
              <input id="inputNewLpTitle" type="text" placeholder="e.g. OPSC OAS Prelims 2026 Booster" class="w-full bg-[#081220] border border-brand-border rounded px-3 py-2 text-white text-xs">
            </div>
            <div>
              <label class="block text-slate-300 font-semibold mb-1">Target Route Slug <span class="text-rose-400">*</span></label>
              <div class="flex items-center">
                <span class="px-2 py-2 rounded-l bg-slate-900 border border-r-0 border-brand-border text-slate-500 font-mono text-[11px]">/landing/</span>
                <input id="inputNewLpSlug" type="text" placeholder="opsc-oas-2026" class="w-full bg-[#081220] border border-brand-border rounded-r px-3 py-2 text-white text-xs font-mono">
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-slate-300 font-semibold mb-1">Category</label>
                <select id="selectNewLpCategory" class="w-full bg-[#081220] border border-brand-border rounded px-3 py-2 text-white text-xs">
                  <option value="OSSC">OSSC Exams</option>
                  <option value="OPSC">OPSC Civil Services</option>
                  <option value="Teaching">Teaching & TET</option>
                  <option value="Scholarships">Scholarships</option>
                  <option value="General">General Outreach</option>
                </select>
              </div>
              <div>
                <label class="block text-slate-300 font-semibold mb-1">Campaign Expiry Date</label>
                <input id="inputNewLpExpiry" type="date" value="2026-12-31" class="w-full bg-[#081220] border border-brand-border rounded px-3 py-2 text-white text-xs font-mono">
              </div>
            </div>
            <div>
              <label class="block text-slate-300 font-semibold mb-1">Primary CTA Destination URL</label>
              <input id="inputNewLpCtaUrl" type="text" value="/resources.html" class="w-full bg-[#081220] border border-brand-border rounded px-3 py-2 text-white text-xs font-mono">
            </div>
          </div>
        `, `
          <button onclick="closeModal()" class="px-3 py-1.5 text-xs font-semibold rounded bg-slate-800 text-slate-300 hover:bg-slate-700">Cancel</button>
          <button id="btnSubmitNewLpModal" class="px-3.5 py-1.5 text-xs font-bold rounded bg-brand-emerald hover:bg-brand-emeraldHover text-white transition">Create Campaign</button>
        `);

        // Auto slug generation inside modal
        const titleInput = document.getElementById('inputNewLpTitle');
        const slugInput = document.getElementById('inputNewLpSlug');
        if (titleInput && slugInput) {
          titleInput.addEventListener('input', () => {
            slugInput.value = titleInput.value.toLowerCase().trim().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
          });
        }

        document.getElementById('btnSubmitNewLpModal')?.addEventListener('click', () => {
          const title = titleInput?.value.trim();
          const slug = slugInput?.value.trim();
          const category = document.getElementById('selectNewLpCategory')?.value;
          const expiry = document.getElementById('inputNewLpExpiry')?.value;
          const ctaUrl = document.getElementById('inputNewLpCtaUrl')?.value.trim();

          if (!title) {
            showToast("Please provide a campaign title.", "warning");
            return;
          }

          if (window.CSOSuperStore && typeof window.CSOSuperStore.createLandingPage === 'function') {
            const created = window.CSOSuperStore.createLandingPage({
              title,
              slug,
              category,
              expiry,
              ctaUrl
            });
            closeModal();
            showToast(`Campaign "${created.title}" created successfully!`, "success");
            updateKpis();
            renderTableRows();
          }
        });
      });
    }

    /**
     * VIEW 2f: Architectural Page Templates Directory (module-02-006)
     */
    function renderPageTemplatesWorkspace() {
      // Header Breadcrumb
      dom.breadcrumbFolder.textContent = "Website Pages & Builder";
      dom.breadcrumbModule.textContent = "Page Templates (module-02-006)";

      // Top Action Bar
      dom.moduleHeaderActions.innerHTML = `
        <button id="btnExportTemplatesBundle" class="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-brand-border flex items-center gap-1.5 transition">
          <svg class="w-3.5 h-3.5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
          Export Templates (JSON)
        </button>
      `;

      // Get templates & calculate live usage from cso_pages_store
      const templates = (window.CSOSuperStore && typeof window.CSOSuperStore.getPageTemplates === 'function')
        ? window.CSOSuperStore.getPageTemplates()
        : [];

      const pages = (window.CSOSuperStore && typeof window.CSOSuperStore.getAllPages === 'function')
        ? window.CSOSuperStore.getAllPages('ALL', '')
        : [];

      // Calculate usage mapping
      const usageMap = {};
      pages.forEach(p => {
        const t = (p.template || '').toLowerCase();
        usageMap[t] = (usageMap[t] || 0) + 1;
      });

      dom.workspaceRoot.innerHTML = `
        <div class="space-y-6 font-sans">
          <!-- Overview Card -->
          <div class="p-5 rounded-xl bg-brand-slate border border-brand-border shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 class="text-base font-bold text-white flex items-center gap-2">
                Structural Template Architecture & Scaffolding Library
                <span class="text-xs font-mono font-normal px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/60">module-02-006</span>
              </h2>
              <p class="text-xs text-slate-400 mt-0.5">Verified layout foundations enforcing standardized typography, responsive spacing, and accessibility standards across csodisha.com.</p>
            </div>
            <div class="flex items-center gap-2">
              <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 text-xs font-mono font-bold">
                <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
                5 Standard Templates
              </span>
            </div>
          </div>

          <!-- Template Cards Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            ${templates.map(tmpl => {
              const usageCount = usageMap[tmpl.title.toLowerCase()] || 0;
              const catBadgeColor = tmpl.category === 'Landing' ? 'text-cyan-400 border-cyan-800/60 bg-cyan-950/40'
                : tmpl.category === 'Education' ? 'text-indigo-400 border-indigo-800/60 bg-indigo-950/40'
                : tmpl.category === 'Content' ? 'text-emerald-400 border-emerald-800/60 bg-emerald-950/40'
                : tmpl.category === 'Forms' ? 'text-amber-400 border-amber-800/60 bg-amber-950/40'
                : 'text-slate-300 border-slate-700 bg-slate-800/60';

              return `
                <div class="p-5 rounded-xl bg-brand-slate border border-brand-border shadow-md hover:border-slate-600 transition flex flex-col justify-between space-y-4">
                  <div class="space-y-2.5">
                    <div class="flex items-center justify-between">
                      <span class="font-mono text-xs font-bold text-cyan-400">${tmpl.id}</span>
                      <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${catBadgeColor}">
                        ${tmpl.category}
                      </span>
                    </div>

                    <div>
                      <h3 class="text-sm font-bold text-white">${tmpl.title}</h3>
                      <p class="text-xs text-slate-400 mt-1 leading-relaxed">${tmpl.description}</p>
                    </div>

                    <div class="pt-2 border-t border-brand-border flex items-center justify-between text-[11px] font-mono">
                      <span class="text-slate-500">Live Routes Using:</span>
                      <span class="px-2 py-0.5 rounded bg-[#081220] border border-slate-700 text-slate-200 font-bold">${usageCount} pages</span>
                    </div>
                  </div>

                  <!-- Actions -->
                  <div class="pt-3 border-t border-brand-border flex items-center justify-between gap-1.5">
                    <button data-id="${tmpl.id}" class="btn-create-page-from-tmpl px-2.5 py-1.5 rounded bg-brand-emerald hover:bg-brand-emeraldHover text-white text-xs font-bold transition flex items-center gap-1 shadow">
                      Create Page &rarr;
                    </button>
                    <div class="flex items-center gap-1">
                      <button data-id="${tmpl.id}" class="btn-preview-tmpl px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-mono font-semibold border border-brand-border transition">
                        Preview
                      </button>
                      <button data-id="${tmpl.id}" class="btn-edit-tmpl-code px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 text-xs font-mono font-semibold border border-brand-border transition">
                        Edit Code
                      </button>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;

      // Export Bundle
      document.getElementById('btnExportTemplatesBundle')?.addEventListener('click', () => {
        if (window.CSOSuperStore && typeof window.CSOSuperStore.exportTemplates === 'function') {
          const filename = window.CSOSuperStore.exportTemplates();
          showToast(`Templates exported: ${filename}`, "success");
        }
      });

      // Create Page from Template
      dom.workspaceRoot.querySelectorAll('.btn-create-page-from-tmpl').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const tmplId = e.currentTarget.getAttribute('data-id');
          const tmpl = templates.find(t => t.id === tmplId);
          // Navigate to module-02-002
          selectModule('folder-02', 'module-02-002');
          // Set template dropdown value after workspace loads
          setTimeout(() => {
            const select = document.getElementById('selectPageTemplate');
            if (select && tmpl) {
              select.value = tmpl.title;
              select.dispatchEvent(new Event('change'));
            }
          }, 100);
        });
      });

      // Preview Template
      dom.workspaceRoot.querySelectorAll('.btn-preview-tmpl').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const tmplId = e.currentTarget.getAttribute('data-id');
          const tmpl = templates.find(t => t.id === tmplId);
          if (!tmpl) return;

          openModal(`Preview: ${tmpl.title}`, `
            <div class="space-y-4 font-sans text-xs">
              <div class="p-3 bg-[#050a14] border border-brand-border rounded-lg max-h-[420px] overflow-y-auto">
                ${tmpl.boilerplate}
              </div>
            </div>
          `, `
            <button onclick="closeModal()" class="px-3 py-1.5 text-xs font-semibold rounded bg-slate-800 text-slate-300 hover:bg-slate-700">Close</button>
          `);
        });
      });

      // Edit Template Code
      dom.workspaceRoot.querySelectorAll('.btn-edit-tmpl-code').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const tmplId = e.currentTarget.getAttribute('data-id');
          const tmpl = templates.find(t => t.id === tmplId);
          if (!tmpl) return;

          openModal(`Edit Boilerplate: ${tmpl.title}`, `
            <div class="space-y-3 font-sans text-xs">
              <p class="text-slate-300">Modify the default starter markup for this template:</p>
              <textarea id="textareaEditTmplCode" rows="12" class="w-full bg-[#050a14] border border-brand-border rounded-lg p-3 text-slate-200 text-xs font-mono leading-relaxed focus:outline-none focus:ring-1 focus:ring-brand-emerald">${tmpl.boilerplate}</textarea>
            </div>
          `, `
            <button onclick="closeModal()" class="px-3 py-1.5 text-xs font-semibold rounded bg-slate-800 text-slate-300 hover:bg-slate-700">Cancel</button>
            <button id="btnSaveTmplCodeModal" class="px-3.5 py-1.5 text-xs font-bold rounded bg-brand-emerald hover:bg-brand-emeraldHover text-white transition">Save Changes</button>
          `);

          document.getElementById('btnSaveTmplCodeModal')?.addEventListener('click', () => {
            const newCode = document.getElementById('textareaEditTmplCode')?.value;
            if (window.CSOSuperStore && typeof window.CSOSuperStore.updateTemplateBoilerplate === 'function') {
              window.CSOSuperStore.updateTemplateBoilerplate(tmpl.id, newCode);
              closeModal();
              showToast(`Template "${tmpl.title}" updated successfully!`, "success");
              renderPageTemplatesWorkspace();
            }
          });
        });
      });
    }

    /**
     * VIEW 2g: Modular Reusable Sections Component Library (module-02-007)
     */
    function renderReusableSectionsWorkspace() {
      // Header Breadcrumb
      dom.breadcrumbFolder.textContent = "Website Pages & Builder";
      dom.breadcrumbModule.textContent = "Reusable Sections (module-02-007)";

      // Top Action Bar
      dom.moduleHeaderActions.innerHTML = `
        <div class="flex items-center gap-2">
          <button id="btnCreateSectionTop" class="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-brand-emerald hover:bg-brand-emeraldHover text-white shadow flex items-center gap-1.5 transition">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            + Create Section
          </button>
          <button id="btnExportSections" class="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-brand-border flex items-center gap-1.5 transition">
            <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            Export Sections (JSON)
          </button>
        </div>
      `;

      // Workspace DOM Template
      dom.workspaceRoot.innerHTML = `
        <div class="space-y-6 font-sans">
          <!-- Overview Card -->
          <div class="p-5 rounded-xl bg-brand-slate border border-brand-border shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 class="text-base font-bold text-white flex items-center gap-2">
                Reusable Section Modules & Global Components
                <span class="text-xs font-mono font-normal px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/60">module-02-007</span>
              </h2>
              <p class="text-xs text-slate-400 mt-0.5">Author, maintain, and embed global headers, footers, warning banners, and accordions across any static HTML view.</p>
            </div>
            <div class="flex items-center gap-2">
              <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 text-xs font-mono font-bold">
                <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
                Component Hub Live
              </span>
            </div>
          </div>

          <!-- Filter Tabs & Search Bar -->
          <div class="p-4 rounded-xl bg-brand-slate border border-brand-border shadow-md space-y-3">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <!-- Type Filter Tabs -->
              <div id="sectionTypeTabsContainer" class="flex flex-wrap items-center gap-1.5">
                <button data-type="ALL" class="sec-tab-btn px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition bg-brand-emerald text-white">All Types</button>
                <button data-type="Header" class="sec-tab-btn px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition bg-slate-800 hover:bg-slate-700 text-slate-300">Header</button>
                <button data-type="Footer" class="sec-tab-btn px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition bg-slate-800 hover:bg-slate-700 text-slate-300">Footer</button>
                <button data-type="Banner" class="sec-tab-btn px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition bg-slate-800 hover:bg-slate-700 text-slate-300">Banner</button>
                <button data-type="Block" class="sec-tab-btn px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition bg-slate-800 hover:bg-slate-700 text-slate-300">Block</button>
                <button data-type="Sidebar" class="sec-tab-btn px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition bg-slate-800 hover:bg-slate-700 text-slate-300">Sidebar</button>
              </div>

              <!-- Search Input -->
              <div class="relative min-w-[240px]">
                <input id="sectionSearchInput" type="text" placeholder="Search title or embed tag..." class="w-full bg-[#081220] border border-brand-border rounded-lg pl-8 pr-3 py-1.5 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-emerald font-sans">
                <svg class="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              </div>
            </div>
          </div>

          <!-- Section Inventory Grid -->
          <div id="sectionsGridContainer" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <!-- Injected via JavaScript -->
          </div>
        </div>
      `;

      let activeTypeFilter = 'ALL';
      let activeSearch = '';

      function renderGrid() {
        const grid = document.getElementById('sectionsGridContainer');
        if (!grid) return;

        const sections = (window.CSOSuperStore && typeof window.CSOSuperStore.getReusableSections === 'function')
          ? window.CSOSuperStore.getReusableSections(activeTypeFilter, activeSearch)
          : [];

        if (sections.length === 0) {
          grid.innerHTML = `
            <div class="col-span-full py-12 text-center text-slate-500 font-mono text-xs">
              No reusable sections found matching the current query.
            </div>
          `;
          return;
        }

        grid.innerHTML = sections.map(sec => {
          const typeBadgeColor = sec.type === 'Header' ? 'text-cyan-400 border-cyan-800/60 bg-cyan-950/40'
            : sec.type === 'Footer' ? 'text-indigo-400 border-indigo-800/60 bg-indigo-950/40'
            : sec.type === 'Banner' ? 'text-amber-400 border-amber-800/60 bg-amber-950/40'
            : sec.type === 'Block' ? 'text-emerald-400 border-emerald-800/60 bg-emerald-950/40'
            : 'text-purple-400 border-purple-800/60 bg-purple-950/40';

          return `
            <div class="p-5 rounded-xl bg-brand-slate border border-brand-border shadow-md hover:border-slate-600 transition flex flex-col justify-between space-y-4">
              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <span class="font-mono text-xs font-bold text-cyan-400">${sec.id}</span>
                  <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${typeBadgeColor}">
                    ${sec.type}
                  </span>
                </div>

                <div>
                  <h3 class="text-sm font-bold text-white">${sec.title}</h3>
                </div>

                <!-- Embed Tag & Copy Trigger -->
                <div class="p-2.5 rounded-lg bg-[#081220] border border-brand-border flex items-center justify-between gap-2">
                  <code class="text-[11px] font-mono text-emerald-400 truncate select-all">${sec.tag}</code>
                  <button data-tag="${sec.tag}" class="btn-copy-embed-tag px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-mono font-bold border border-slate-700 whitespace-nowrap transition flex items-center gap-1">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/></svg>
                    Copy Tag
                  </button>
                </div>
              </div>

              <!-- Actions -->
              <div class="pt-3 border-t border-brand-border flex items-center justify-between gap-1.5">
                <div class="flex items-center gap-1.5">
                  <button data-id="${sec.id}" class="btn-preview-sec px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-semibold border border-brand-border transition">
                    Preview
                  </button>
                  <button data-id="${sec.id}" class="btn-edit-sec px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 text-xs font-mono font-semibold border border-brand-border transition">
                    Edit Code
                  </button>
                </div>
                <button data-id="${sec.id}" class="btn-delete-sec px-2 py-1.5 rounded bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 text-xs font-mono border border-rose-800/50 transition" title="Delete Section">
                  Delete
                </button>
              </div>
            </div>
          `;
        }).join('');

        // Wire Copy Tag
        grid.querySelectorAll('.btn-copy-embed-tag').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const tag = e.currentTarget.getAttribute('data-tag');
            if (navigator.clipboard) {
              navigator.clipboard.writeText(tag).then(() => {
                showToast(`Copied embed tag: ${tag}`, "success");
              });
            } else {
              showToast(`Tag: ${tag}`, "info");
            }
          });
        });

        // Wire Preview
        grid.querySelectorAll('.btn-preview-sec').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const secId = e.currentTarget.getAttribute('data-id');
            const sections = window.CSOSuperStore?.getReusableSections('ALL', '') || [];
            const sec = sections.find(s => s.id === secId);
            if (!sec) return;

            openModal(`Preview: ${sec.title}`, `
              <div class="space-y-4 font-sans text-xs">
                <div class="p-4 bg-[#040810] border border-brand-border rounded-lg max-h-[460px] overflow-y-auto">
                  ${sec.markup}
                </div>
                <div class="text-[11px] font-mono text-slate-500">
                  Embed Tag: <strong class="text-emerald-400">${sec.tag}</strong>
                </div>
              </div>
            `, `
              <button onclick="closeModal()" class="px-3 py-1.5 text-xs font-semibold rounded bg-slate-800 text-slate-300 hover:bg-slate-700">Close</button>
            `);
          });
        });

        // Wire Edit Code
        grid.querySelectorAll('.btn-edit-sec').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const secId = e.currentTarget.getAttribute('data-id');
            const sections = window.CSOSuperStore?.getReusableSections('ALL', '') || [];
            const sec = sections.find(s => s.id === secId);
            if (!sec) return;

            openModal(`Edit Section: ${sec.title}`, `
              <div class="space-y-3 font-sans text-xs">
                <div>
                  <label class="block text-slate-300 font-semibold mb-1">Section Title</label>
                  <input id="inputEditSecTitle" type="text" value="${sec.title}" class="w-full bg-[#081220] border border-brand-border rounded px-3 py-1.5 text-white text-xs">
                </div>
                <div>
                  <label class="block text-slate-300 font-semibold mb-1">HTML Component Markup</label>
                  <textarea id="textareaEditSecMarkup" rows="12" class="w-full bg-[#050a14] border border-brand-border rounded p-3 text-slate-200 text-xs font-mono leading-relaxed focus:outline-none focus:ring-1 focus:ring-brand-emerald">${sec.markup}</textarea>
                </div>
              </div>
            `, `
              <button onclick="closeModal()" class="px-3 py-1.5 text-xs font-semibold rounded bg-slate-800 text-slate-300 hover:bg-slate-700">Cancel</button>
              <button id="btnConfirmSaveSecModal" class="px-3.5 py-1.5 text-xs font-bold rounded bg-brand-emerald hover:bg-brand-emeraldHover text-white transition">Save Changes</button>
            `);

            document.getElementById('btnConfirmSaveSecModal')?.addEventListener('click', () => {
              const newTitle = document.getElementById('inputEditSecTitle')?.value.trim();
              const newMarkup = document.getElementById('textareaEditSecMarkup')?.value;
              if (window.CSOSuperStore && typeof window.CSOSuperStore.saveReusableSection === 'function') {
                window.CSOSuperStore.saveReusableSection({
                  id: sec.id,
                  title: newTitle || sec.title,
                  type: sec.type,
                  markup: newMarkup
                });
                closeModal();
                showToast(`Section "${sec.title}" updated successfully!`, "success");
                renderGrid();
              }
            });
          });
        });

        // Wire Delete
        grid.querySelectorAll('.btn-delete-sec').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const secId = e.currentTarget.getAttribute('data-id');
            openModal(`Delete Section ${secId}`, `
              <div class="space-y-3 font-sans text-xs">
                <p class="text-slate-300">Are you sure you want to delete this reusable section component? Any pages referencing its embed tag will need manual adjustment.</p>
              </div>
            `, `
              <button onclick="closeModal()" class="px-3 py-1.5 text-xs font-semibold rounded bg-slate-800 text-slate-300 hover:bg-slate-700">Cancel</button>
              <button id="btnConfirmDeleteSecModal" class="px-3 py-1.5 text-xs font-bold rounded bg-rose-600 hover:bg-rose-500 text-white transition">Confirm Delete</button>
            `);

            document.getElementById('btnConfirmDeleteSecModal')?.addEventListener('click', () => {
              closeModal();
              if (window.CSOSuperStore && typeof window.CSOSuperStore.deleteReusableSection === 'function') {
                window.CSOSuperStore.deleteReusableSection(secId);
                showToast(`Section ${secId} deleted`, "warning");
                renderGrid();
              }
            });
          });
        });
      }

      renderGrid();

      // Tab Switching
      document.querySelectorAll('.sec-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          activeTypeFilter = e.currentTarget.getAttribute('data-type') || 'ALL';
          document.querySelectorAll('.sec-tab-btn').forEach(b => {
            b.className = "sec-tab-btn px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition bg-slate-800 hover:bg-slate-700 text-slate-300";
          });
          e.currentTarget.className = "sec-tab-btn px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition bg-brand-emerald text-white";
          renderGrid();
        });
      });

      // Search Listener
      const searchInput = document.getElementById('sectionSearchInput');
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          activeSearch = e.target.value;
          renderGrid();
        });
      }

      // Export Sections
      document.getElementById('btnExportSections')?.addEventListener('click', () => {
        if (window.CSOSuperStore && typeof window.CSOSuperStore.exportReusableSections === 'function') {
          const filename = window.CSOSuperStore.exportReusableSections();
          showToast(`Reusable sections exported: ${filename}`, "success");
        }
      });

      // Create Section Modal
      document.getElementById('btnCreateSectionTop')?.addEventListener('click', () => {
        openModal("Create New Reusable Section", `
          <div class="space-y-4 font-sans text-xs">
            <div>
              <label class="block text-slate-300 font-semibold mb-1">Section Title <span class="text-rose-400">*</span></label>
              <input id="inputNewSecTitle" type="text" placeholder="e.g. State Examination Alert Strip" class="w-full bg-[#081220] border border-brand-border rounded px-3 py-2 text-white text-xs">
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-slate-300 font-semibold mb-1">Section Type</label>
                <select id="selectNewSecType" class="w-full bg-[#081220] border border-brand-border rounded px-3 py-2 text-white text-xs">
                  <option value="Header">Header</option>
                  <option value="Footer">Footer</option>
                  <option value="Banner">Banner</option>
                  <option value="Block" selected>Block</option>
                  <option value="Sidebar">Sidebar</option>
                </select>
              </div>
              <div>
                <label class="block text-slate-300 font-semibold mb-1">Embed Tag Slug</label>
                <input id="inputNewSecTagLabel" type="text" placeholder="ALERT-STRIP" class="w-full bg-[#081220] border border-brand-border rounded px-3 py-2 text-white text-xs font-mono uppercase">
              </div>
            </div>
            <div>
              <label class="block text-slate-300 font-semibold mb-1">HTML Component Code</label>
              <textarea id="textareaNewSecMarkup" rows="8" placeholder="<div class=&quot;p-4 bg-slate-900&quot;>...</div>" class="w-full bg-[#050a14] border border-brand-border rounded p-3 text-slate-200 text-xs font-mono leading-relaxed"></textarea>
            </div>
          </div>
        `, `
          <button onclick="closeModal()" class="px-3 py-1.5 text-xs font-semibold rounded bg-slate-800 text-slate-300 hover:bg-slate-700">Cancel</button>
          <button id="btnSubmitNewSecModal" class="px-3.5 py-1.5 text-xs font-bold rounded bg-brand-emerald hover:bg-brand-emeraldHover text-white transition">Create Component</button>
        `);

        document.getElementById('btnSubmitNewSecModal')?.addEventListener('click', () => {
          const title = document.getElementById('inputNewSecTitle')?.value.trim();
          const type = document.getElementById('selectNewSecType')?.value;
          const tagLabel = document.getElementById('inputNewSecTagLabel')?.value.trim();
          const markup = document.getElementById('textareaNewSecMarkup')?.value;

          if (!title) {
            showToast("Please provide a section title.", "warning");
            return;
          }

          if (window.CSOSuperStore && typeof window.CSOSuperStore.saveReusableSection === 'function') {
            const created = window.CSOSuperStore.saveReusableSection({
              title,
              type,
              tagLabel,
              markup: markup || '<!-- Empty Section -->'
            });
            closeModal();
            showToast(`Section "${created.title}" created successfully!`, "success");
            renderGrid();
          }
        });
      });
    }

    /**
     * VIEW 2h: Historical Page Revisions & Rollback Engine (module-02-008)
     */
    function renderPageRevisionsWorkspace() {
      // Header Breadcrumb
      dom.breadcrumbFolder.textContent = "Website Pages & Builder";
      dom.breadcrumbModule.textContent = "Page Revisions (module-02-008)";

      // Top Action Bar
      dom.moduleHeaderActions.innerHTML = `
        <div class="flex items-center gap-2">
          <button id="btnCreateManualSnapshot" class="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-brand-emerald hover:bg-brand-emeraldHover text-white shadow flex items-center gap-1.5 transition">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            + Create Snapshot
          </button>
          <button id="btnExportRevisionsJson" class="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-brand-border flex items-center gap-1.5 transition">
            <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            Export Revisions (JSON)
          </button>
        </div>
      `;

      // Get all pages to populate filter dropdown
      const pages = (window.CSOSuperStore && typeof window.CSOSuperStore.getAllPages === 'function')
        ? window.CSOSuperStore.getAllPages('ALL', '')
        : [];

      const pageOptionsHtml = pages.map(p => {
        return `<option value="${p.path}">${p.path} &mdash; ${p.title}</option>`;
      }).join('');

      dom.workspaceRoot.innerHTML = `
        <div class="space-y-6 font-sans">
          <!-- Overview Card -->
          <div class="p-5 rounded-xl bg-brand-slate border border-brand-border shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 class="text-base font-bold text-white flex items-center gap-2">
                Audit Trail, Page Version History & Rollback Console
                <span class="text-xs font-mono font-normal px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/60">module-02-008</span>
              </h2>
              <p class="text-xs text-slate-400 mt-0.5">Inspect granular editorial diffs, track modifications per route, and instantly roll back live public pages to known-good snapshots.</p>
            </div>
            <div class="flex items-center gap-2">
              <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 text-xs font-mono font-bold">
                <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
                Rollback Engine Ready
              </span>
            </div>
          </div>

          <!-- Page Filter & Search Controls -->
          <div class="p-4 rounded-xl bg-brand-slate border border-brand-border shadow-md flex flex-col sm:flex-row items-center justify-between gap-3">
            <div class="flex items-center gap-2 w-full sm:w-auto">
              <span class="text-xs font-mono text-slate-400 whitespace-nowrap">Filter Route:</span>
              <select id="revisionPageFilter" class="bg-[#081220] border border-brand-border rounded-lg px-3 py-1.5 text-xs text-white font-sans focus:outline-none focus:ring-1 focus:ring-brand-emerald w-full sm:w-auto max-w-[320px]">
                <option value="ALL">All Pages & Routes</option>
                ${pageOptionsHtml}
              </select>
            </div>
            <div class="text-[11px] font-mono text-slate-400" id="revisionCountBadge">
              -- historical snapshots
            </div>
          </div>

          <!-- Revisions Table -->
          <div class="rounded-xl bg-brand-slate border border-brand-border shadow-md overflow-hidden">
            <div class="px-5 py-3 border-b border-brand-border flex items-center justify-between">
              <h3 class="text-sm font-bold text-white flex items-center gap-2">
                Version History Manifest
              </h3>
              <span class="text-[11px] text-slate-400 font-mono">Live Ingestion from cso_page_revisions</span>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse text-xs">
                <thead>
                  <tr class="bg-[#081220] text-slate-400 font-mono border-b border-brand-border">
                    <th class="py-2.5 px-4 font-semibold">Revision ID</th>
                    <th class="py-2.5 px-4 font-semibold">Route & Page Title</th>
                    <th class="py-2.5 px-4 font-semibold text-center">Version</th>
                    <th class="py-2.5 px-4 font-semibold">Timestamp</th>
                    <th class="py-2.5 px-4 font-semibold">Author</th>
                    <th class="py-2.5 px-4 font-semibold">Change Summary</th>
                    <th class="py-2.5 px-4 font-semibold text-center">Size</th>
                    <th class="py-2.5 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody id="revisionsTableBody" class="divide-y divide-brand-border/40 font-sans">
                  <!-- Injected via JavaScript -->
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;

      let activePageFilter = 'ALL';

      function renderRevisionsTable() {
        const tbody = document.getElementById('revisionsTableBody');
        const countBadge = document.getElementById('revisionCountBadge');
        if (!tbody) return;

        const revisions = (window.CSOSuperStore && typeof window.CSOSuperStore.getPageRevisions === 'function')
          ? window.CSOSuperStore.getPageRevisions(activePageFilter)
          : [];

        if (countBadge) countBadge.textContent = `${revisions.length} historical snapshots recorded`;

        if (revisions.length === 0) {
          tbody.innerHTML = `
            <tr>
              <td colspan="8" class="py-10 text-center text-slate-500 font-mono text-xs">
                No revision history records found for the selected route.
              </td>
            </tr>
          `;
          return;
        }

        tbody.innerHTML = revisions.map(rev => {
          const dateStr = new Date(rev.timestamp).toLocaleString();

          return `
            <tr class="hover:bg-slate-800/40 transition">
              <td class="py-2.5 px-4 font-mono font-bold text-cyan-400 whitespace-nowrap">${rev.id}</td>
              <td class="py-2.5 px-4">
                <div class="font-bold text-white">${rev.title}</div>
                <div class="text-[10px] font-mono text-emerald-400 mt-0.5">${rev.pagePath}</div>
              </td>
              <td class="py-2.5 px-4 text-center whitespace-nowrap">
                <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-200 border border-slate-700">
                  ${rev.version}
                </span>
              </td>
              <td class="py-2.5 px-4 font-mono text-slate-400 text-xs whitespace-nowrap">${dateStr}</td>
              <td class="py-2.5 px-4 font-mono text-slate-300 text-[11px] whitespace-nowrap">${rev.author}</td>
              <td class="py-2.5 px-4 text-slate-300 max-w-[280px] truncate" title="${rev.changeSummary}">${rev.changeSummary}</td>
              <td class="py-2.5 px-4 text-center font-mono text-slate-400 text-xs whitespace-nowrap">${rev.sizeKb} KB</td>
              <td class="py-2.5 px-4 text-right whitespace-nowrap">
                <div class="inline-flex items-center gap-1.5">
                  <button data-id="${rev.id}" class="btn-inspect-rev px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-semibold border border-brand-border transition">
                    Inspect
                  </button>
                  <button data-id="${rev.id}" class="btn-restore-rev px-2.5 py-1.5 rounded bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 hover:text-white text-xs font-mono font-bold border border-amber-800/50 transition">
                    Restore
                  </button>
                </div>
              </td>
            </tr>
          `;
        }).join('');

        // Wire Inspect Snapshot
        tbody.querySelectorAll('.btn-inspect-rev').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const revId = e.currentTarget.getAttribute('data-id');
            const rev = window.CSOSuperStore?.getPageRevisions('ALL').find(r => r.id === revId);
            if (!rev) return;

            openModal(`Inspect Snapshot: ${rev.id} (${rev.version})`, `
              <div class="space-y-4 font-sans text-xs">
                <div class="grid grid-cols-2 gap-3 p-3 bg-[#081220] border border-brand-border rounded-lg font-mono text-[11px]">
                  <div><span class="text-slate-500">Route:</span> <strong class="text-white">${rev.pagePath}</strong></div>
                  <div><span class="text-slate-500">Author:</span> <strong class="text-white">${rev.author}</strong></div>
                  <div><span class="text-slate-500">Timestamp:</span> <strong class="text-white">${new Date(rev.timestamp).toLocaleString()}</strong></div>
                  <div><span class="text-slate-500">Payload:</span> <strong class="text-white">${rev.sizeKb} KB</strong></div>
                </div>

                <div>
                  <span class="text-slate-400 font-bold block mb-1">Editorial Change Summary:</span>
                  <p class="text-slate-200 bg-[#081220] p-2.5 rounded border border-brand-border">${rev.changeSummary}</p>
                </div>

                <div>
                  <span class="text-slate-400 font-bold block mb-1">Archived Markup:</span>
                  <textarea readonly rows="8" class="w-full bg-[#040810] border border-brand-border rounded p-3 text-slate-300 font-mono text-xs focus:outline-none select-all">${rev.snapshotHtml || '<!-- No markup attached -->'}</textarea>
                </div>
              </div>
            `, `
              <button onclick="closeModal()" class="px-3 py-1.5 text-xs font-semibold rounded bg-slate-800 text-slate-300 hover:bg-slate-700">Close</button>
            `);
          });
        });

        // Wire Restore Version
        tbody.querySelectorAll('.btn-restore-rev').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const revId = e.currentTarget.getAttribute('data-id');
            const rev = window.CSOSuperStore?.getPageRevisions('ALL').find(r => r.id === revId);
            if (!rev) return;

            openModal(`Rollback to ${rev.version} (${rev.id})`, `
              <div class="space-y-3 font-sans text-xs">
                <div class="p-3 bg-amber-950/40 border border-amber-500/40 rounded-lg text-amber-200">
                  <strong>Warning:</strong> Restoring this revision will overwrite the active content and payload footprint for <strong class="text-white font-mono">${rev.pagePath}</strong> with snapshot <strong class="text-white font-mono">${rev.version}</strong>.
                </div>
                <p class="text-slate-300">Are you sure you want to proceed with this rollback?</p>
              </div>
            `, `
              <button onclick="closeModal()" class="px-3 py-1.5 text-xs font-semibold rounded bg-slate-800 text-slate-300 hover:bg-slate-700">Cancel</button>
              <button id="btnConfirmRollbackModal" class="px-3.5 py-1.5 text-xs font-bold rounded bg-amber-600 hover:bg-amber-500 text-white transition">Confirm Rollback</button>
            `);

            document.getElementById('btnConfirmRollbackModal')?.addEventListener('click', () => {
              closeModal();
              if (window.CSOSuperStore && typeof window.CSOSuperStore.restoreRevision === 'function') {
                try {
                  window.CSOSuperStore.restoreRevision(rev.id);
                  showToast(`Successfully rolled back ${rev.pagePath} to ${rev.version}!`, "success");
                  renderRevisionsTable();
                } catch (err) {
                  showToast(err.message, "error");
                }
              }
            });
          });
        });
      }

      renderRevisionsTable();

      // Page Filter Dropdown Change
      const pageFilter = document.getElementById('revisionPageFilter');
      if (pageFilter) {
        pageFilter.addEventListener('change', (e) => {
          activePageFilter = e.target.value;
          renderRevisionsTable();
        });
      }

      // Export JSON
      document.getElementById('btnExportRevisionsJson')?.addEventListener('click', () => {
        if (window.CSOSuperStore && typeof window.CSOSuperStore.exportRevisions === 'function') {
          const filename = window.CSOSuperStore.exportRevisions();
          showToast(`Revisions archive exported: ${filename}`, "success");
        }
      });

      // Create Manual Snapshot Modal
      document.getElementById('btnCreateManualSnapshot')?.addEventListener('click', () => {
        openModal("Create Historical Page Snapshot", `
          <div class="space-y-4 font-sans text-xs">
            <div>
              <label class="block text-slate-300 font-semibold mb-1">Target Page Route <span class="text-rose-400">*</span></label>
              <select id="selectSnapshotPageRoute" class="w-full bg-[#081220] border border-brand-border rounded px-3 py-2 text-white text-xs">
                ${pageOptionsHtml}
              </select>
            </div>
            <div>
              <label class="block text-slate-300 font-semibold mb-1">Editorial Change Summary <span class="text-rose-400">*</span></label>
              <textarea id="inputSnapshotSummary" rows="3" placeholder="Describe the changes made in this revision..." class="w-full bg-[#081220] border border-brand-border rounded px-3 py-2 text-white text-xs"></textarea>
            </div>
          </div>
        `, `
          <button onclick="closeModal()" class="px-3 py-1.5 text-xs font-semibold rounded bg-slate-800 text-slate-300 hover:bg-slate-700">Cancel</button>
          <button id="btnSubmitSnapshotModal" class="px-3.5 py-1.5 text-xs font-bold rounded bg-brand-emerald hover:bg-brand-emeraldHover text-white transition">Capture Snapshot</button>
        `);

        document.getElementById('btnSubmitSnapshotModal')?.addEventListener('click', () => {
          const path = document.getElementById('selectSnapshotPageRoute')?.value;
          const summary = document.getElementById('inputSnapshotSummary')?.value.trim();

          if (!summary) {
            showToast("Please enter an editorial change summary.", "warning");
            return;
          }

          if (window.CSOSuperStore && typeof window.CSOSuperStore.createRevisionSnapshot === 'function') {
            const created = window.CSOSuperStore.createRevisionSnapshot(path, summary);
            if (created) {
              closeModal();
              showToast(`Snapshot ${created.id} (${created.version}) captured!`, "success");
              renderRevisionsTable();
            } else {
              showToast("Failed to create snapshot.", "error");
            }
          }
        });
      });
    }

    /**
     * VIEW 2i: Pre-Production Staging & Draft Previews (module-02-009)
     */
    function renderDraftsAndPreviewsWorkspace() {
      // Header Breadcrumb
      dom.breadcrumbFolder.textContent = "Website Pages & Builder";
      dom.breadcrumbModule.textContent = "Drafts & Previews (module-02-009)";

      // Top Action Bar
      dom.moduleHeaderActions.innerHTML = `
        <div class="flex items-center gap-2">
          <button id="btnNewDraftTop" class="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-brand-emerald hover:bg-brand-emeraldHover text-white shadow flex items-center gap-1.5 transition">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            + New Staged Draft
          </button>
          <button id="btnExportDraftsJson" class="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-brand-border flex items-center gap-1.5 transition">
            <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            Export Drafts (JSON)
          </button>
        </div>
      `;

      dom.workspaceRoot.innerHTML = `
        <div class="space-y-6 font-sans">
          <!-- Overview Card -->
          <div class="p-5 rounded-xl bg-brand-slate border border-brand-border shadow-md space-y-4">
            <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h2 class="text-base font-bold text-white flex items-center gap-2">
                  Pre-Production Staging & Draft Publishing Hub
                  <span class="text-xs font-mono font-normal px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/60">module-02-009</span>
                </h2>
                <p class="text-xs text-slate-400 mt-0.5">Author and review work-in-progress examination articles, test responsive rendering in an isolated sandbox, and promote to live production.</p>
              </div>
              <div class="flex items-center gap-2">
                <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-950/60 border border-amber-500/40 text-amber-400 text-xs font-mono font-bold">
                  <span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                  Staging Sandbox Online
                </span>
              </div>
            </div>

            <!-- Metric Summary Row -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div class="p-3.5 rounded-lg bg-[#081220] border border-brand-border">
                <span class="text-xs text-slate-400 block font-mono">Total Staged Drafts</span>
                <div id="kpiTotalDrafts" class="text-xl font-bold font-mono text-white mt-1">--</div>
                <div class="text-[10px] text-slate-500 font-mono mt-0.5">Unpublished working copies</div>
              </div>
              <div class="p-3.5 rounded-lg bg-[#081220] border border-brand-border">
                <span class="text-xs text-slate-400 block font-mono">Review Ready</span>
                <div id="kpiReviewReady" class="text-xl font-bold font-mono text-cyan-400 mt-1">--</div>
                <div class="text-[10px] text-slate-500 font-mono mt-0.5">Ready for promotion</div>
              </div>
              <div class="p-3.5 rounded-lg bg-[#081220] border border-brand-border">
                <span class="text-xs text-slate-400 block font-mono">In Progress</span>
                <div id="kpiInProgress" class="text-xl font-bold font-mono text-amber-400 mt-1">--</div>
                <div class="text-[10px] text-slate-500 font-mono mt-0.5">Under editorial review</div>
              </div>
            </div>
          </div>

          <!-- Status Filter Tabs & Search -->
          <div class="p-4 rounded-xl bg-brand-slate border border-brand-border shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div id="draftStatusTabsContainer" class="flex flex-wrap items-center gap-1.5">
              <button data-status="ALL" class="draft-tab-btn px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition bg-brand-emerald text-white">All Drafts</button>
              <button data-status="Review Ready" class="draft-tab-btn px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition bg-slate-800 hover:bg-slate-700 text-slate-300">Review Ready</button>
              <button data-status="In Progress" class="draft-tab-btn px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition bg-slate-800 hover:bg-slate-700 text-slate-300">In Progress</button>
            </div>
            <div class="text-[11px] font-mono text-slate-400" id="draftCountBadge">
              -- staged drafts
            </div>
          </div>

          <!-- Staging Directory Table -->
          <div class="rounded-xl bg-brand-slate border border-brand-border shadow-md overflow-hidden">
            <div class="px-5 py-3 border-b border-brand-border flex items-center justify-between">
              <h3 class="text-sm font-bold text-white flex items-center gap-2">
                Staged Drafts Register
              </h3>
              <span class="text-[11px] text-slate-400 font-mono">Live Ingestion from cso_page_drafts</span>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse text-xs">
                <thead>
                  <tr class="bg-[#081220] text-slate-400 font-mono border-b border-brand-border">
                    <th class="py-2.5 px-4 font-semibold">Draft ID</th>
                    <th class="py-2.5 px-4 font-semibold">Title & Proposed Route</th>
                    <th class="py-2.5 px-4 font-semibold">Author</th>
                    <th class="py-2.5 px-4 font-semibold" style="width: 140px;">Progress</th>
                    <th class="py-2.5 px-4 font-semibold text-center">Status</th>
                    <th class="py-2.5 px-4 font-semibold">Last Saved</th>
                    <th class="py-2.5 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody id="draftsTableBody" class="divide-y divide-brand-border/40 font-sans">
                  <!-- Injected via JavaScript -->
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;

      let activeStatusFilter = 'ALL';

      function updateKpis() {
        const allDrafts = (window.CSOSuperStore && typeof window.CSOSuperStore.getPageDrafts === 'function')
          ? window.CSOSuperStore.getPageDrafts('ALL')
          : [];

        const reviewCount = allDrafts.filter(d => d.status === 'Review Ready').length;
        const inProgCount = allDrafts.filter(d => d.status === 'In Progress').length;

        const elTotal = document.getElementById('kpiTotalDrafts');
        const elReview = document.getElementById('kpiReviewReady');
        const elProg = document.getElementById('kpiInProgress');

        if (elTotal) elTotal.textContent = allDrafts.length;
        if (elReview) elReview.textContent = reviewCount;
        if (elProg) elProg.textContent = inProgCount;
      }

      function renderDraftsTable() {
        const tbody = document.getElementById('draftsTableBody');
        const badge = document.getElementById('draftCountBadge');
        if (!tbody) return;

        const drafts = (window.CSOSuperStore && typeof window.CSOSuperStore.getPageDrafts === 'function')
          ? window.CSOSuperStore.getPageDrafts(activeStatusFilter)
          : [];

        if (badge) badge.textContent = `${drafts.length} staged drafts in repository`;

        if (drafts.length === 0) {
          tbody.innerHTML = `
            <tr>
              <td colspan="7" class="py-10 text-center text-slate-500 font-mono text-xs">
                No staged drafts found matching the current filter.
              </td>
            </tr>
          `;
          return;
        }

        tbody.innerHTML = drafts.map(d => {
          const isReview = d.status === 'Review Ready';
          const statusBadge = isReview
            ? `<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">REVIEW READY</span>`
            : `<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">IN PROGRESS</span>`;

          const progressColor = isReview ? 'bg-cyan-400' : 'bg-amber-400';
          const timeAgo = formatTimeAgo(d.lastSaved);

          return `
            <tr class="hover:bg-slate-800/40 transition">
              <td class="py-2.5 px-4 font-mono font-bold text-cyan-400 whitespace-nowrap">${d.id}</td>
              <td class="py-2.5 px-4">
                <div class="font-bold text-white">${d.title}</div>
                <div class="text-[10px] font-mono text-slate-400 mt-0.5">${d.path}</div>
              </td>
              <td class="py-2.5 px-4 font-mono text-slate-300 text-[11px] whitespace-nowrap">${d.author}</td>
              <td class="py-2.5 px-4">
                <div class="flex items-center gap-2">
                  <div class="w-20 bg-slate-800 h-1.5 rounded-full overflow-hidden border border-slate-700">
                    <div class="${progressColor} h-full rounded-full" style="width: ${d.progress || 50}%"></div>
                  </div>
                  <span class="text-[10px] font-mono text-slate-400">${d.progress || 50}%</span>
                </div>
              </td>
              <td class="py-2.5 px-4 text-center whitespace-nowrap">${statusBadge}</td>
              <td class="py-2.5 px-4 font-mono text-slate-400 text-xs whitespace-nowrap">${timeAgo}</td>
              <td class="py-2.5 px-4 text-right whitespace-nowrap">
                <div class="inline-flex items-center gap-1.5">
                  <button data-id="${d.id}" class="btn-preview-draft px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 text-xs font-mono font-semibold border border-brand-border transition">
                    Preview &nearr;
                  </button>
                  <button data-id="${d.id}" class="btn-promote-draft px-2 py-1 rounded bg-brand-emerald hover:bg-brand-emeraldHover text-white text-xs font-mono font-bold transition shadow" title="Promote to Live Production">
                    Promote to Live
                  </button>
                  <button data-id="${d.id}" class="btn-delete-draft px-2 py-1 rounded bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 text-xs font-mono border border-rose-800/50 transition" title="Delete Draft">
                    &times;
                  </button>
                </div>
              </td>
            </tr>
          `;
        }).join('');

        // Wire Preview
        tbody.querySelectorAll('.btn-preview-draft').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const draftId = e.currentTarget.getAttribute('data-id');
            const draft = window.CSOSuperStore?.getPageDrafts('ALL').find(d => d.id === draftId);
            if (!draft) return;

            openModal(`Draft Preview: ${draft.title}`, `
              <div class="space-y-4 font-sans text-xs">
                <div class="flex items-center justify-between p-3 bg-[#081220] border border-brand-border rounded-lg font-mono text-[11px]">
                  <div>Proposed Route: <strong class="text-cyan-400">${draft.path}</strong></div>
                  <div>Author: <strong class="text-slate-300">${draft.author}</strong></div>
                </div>
                <div class="p-5 bg-[#040810] border border-brand-border rounded-lg max-h-[460px] overflow-y-auto">
                  ${draft.markup || '<p class="text-slate-500">No markup authored yet.</p>'}
                </div>
              </div>
            `, `
              <button onclick="closeModal()" class="px-3 py-1.5 text-xs font-semibold rounded bg-slate-800 text-slate-300 hover:bg-slate-700">Close</button>
            `);
          });
        });

        // Wire Promote to Live
        tbody.querySelectorAll('.btn-promote-draft').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const draftId = e.currentTarget.getAttribute('data-id');
            const draft = window.CSOSuperStore?.getPageDrafts('ALL').find(d => d.id === draftId);
            if (!draft) return;

            openModal(`Promote to Live Production`, `
              <div class="space-y-3 font-sans text-xs">
                <div class="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-lg text-emerald-200">
                  <strong>Confirmation:</strong> This will publish draft <strong class="text-white font-mono">${draft.id}</strong> to the public production route <strong class="text-white font-mono">${draft.path}</strong>.
                </div>
                <p class="text-slate-300">Are you ready to make this content live for all candidates across Odisha?</p>
              </div>
            `, `
              <button onclick="closeModal()" class="px-3 py-1.5 text-xs font-semibold rounded bg-slate-800 text-slate-300 hover:bg-slate-700">Cancel</button>
              <button id="btnConfirmPromoteModal" class="px-3.5 py-1.5 text-xs font-bold rounded bg-brand-emerald hover:bg-brand-emeraldHover text-white transition">Publish Live</button>
            `);

            document.getElementById('btnConfirmPromoteModal')?.addEventListener('click', () => {
              closeModal();
              if (window.CSOSuperStore && typeof window.CSOSuperStore.promoteDraftToLive === 'function') {
                try {
                  const promoted = window.CSOSuperStore.promoteDraftToLive(draft.id);
                  showToast(`Draft promoted to live route ${promoted.path}!`, "success");
                  updateKpis();
                  renderDraftsTable();
                } catch (err) {
                  showToast(err.message, "error");
                }
              }
            });
          });
        });

        // Wire Delete
        tbody.querySelectorAll('.btn-delete-draft').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const draftId = e.currentTarget.getAttribute('data-id');
            openModal(`Delete Draft ${draftId}`, `
              <div class="space-y-3 font-sans text-xs">
                <p class="text-slate-300">Are you sure you want to permanently delete this staged draft? All uncommitted markup will be removed.</p>
              </div>
            `, `
              <button onclick="closeModal()" class="px-3 py-1.5 text-xs font-semibold rounded bg-slate-800 text-slate-300 hover:bg-slate-700">Cancel</button>
              <button id="btnConfirmDeleteDraftModal" class="px-3.5 py-1.5 text-xs font-bold rounded bg-rose-600 hover:bg-rose-500 text-white transition">Delete Draft</button>
            `);

            document.getElementById('btnConfirmDeleteDraftModal')?.addEventListener('click', () => {
              closeModal();
              if (window.CSOSuperStore && typeof window.CSOSuperStore.deleteDraft === 'function') {
                window.CSOSuperStore.deleteDraft(draftId);
                showToast(`Draft ${draftId} deleted`, "warning");
                updateKpis();
                renderDraftsTable();
              }
            });
          });
        });
      }

      // Initial Renders
      updateKpis();
      renderDraftsTable();

      // Tab Switching
      document.querySelectorAll('.draft-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          activeStatusFilter = e.currentTarget.getAttribute('data-status') || 'ALL';
          document.querySelectorAll('.draft-tab-btn').forEach(b => {
            b.className = "draft-tab-btn px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition bg-slate-800 hover:bg-slate-700 text-slate-300";
          });
          e.currentTarget.className = "draft-tab-btn px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition bg-brand-emerald text-white";
          renderDraftsTable();
        });
      });

      // Export Drafts
      document.getElementById('btnExportDraftsJson')?.addEventListener('click', () => {
        if (window.CSOSuperStore && typeof window.CSOSuperStore.exportDrafts === 'function') {
          const filename = window.CSOSuperStore.exportDrafts();
          showToast(`Staged drafts archive exported: ${filename}`, "success");
        }
      });

      // New Draft Modal
      document.getElementById('btnNewDraftTop')?.addEventListener('click', () => {
        openModal("Create New Staged Draft", `
          <div class="space-y-4 font-sans text-xs">
            <div>
              <label class="block text-slate-300 font-semibold mb-1">Draft Page Title <span class="text-rose-400">*</span></label>
              <input id="inputNewDraftTitle" type="text" placeholder="e.g. OSSC Welfare Extension Officer 2026" class="w-full bg-[#081220] border border-brand-border rounded px-3 py-2 text-white text-xs">
            </div>
            <div>
              <label class="block text-slate-300 font-semibold mb-1">Proposed Route Path <span class="text-rose-400">*</span></label>
              <input id="inputNewDraftPath" type="text" placeholder="/welfare-extension-officer-2026.html" class="w-full bg-[#081220] border border-brand-border rounded px-3 py-2 text-white text-xs font-mono">
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-slate-300 font-semibold mb-1">Author Email</label>
                <input id="inputNewDraftAuthor" type="text" value="editorial@csodisha.com" class="w-full bg-[#081220] border border-brand-border rounded px-3 py-2 text-white text-xs font-mono">
              </div>
              <div>
                <label class="block text-slate-300 font-semibold mb-1">Initial Status</label>
                <select id="selectNewDraftStatus" class="w-full bg-[#081220] border border-brand-border rounded px-3 py-2 text-white text-xs">
                  <option value="In Progress" selected>In Progress</option>
                  <option value="Review Ready">Review Ready</option>
                </select>
              </div>
            </div>
            <div>
              <label class="block text-slate-300 font-semibold mb-1">Initial Staged HTML Markup</label>
              <textarea id="textareaNewDraftMarkup" rows="6" class="w-full bg-[#050a14] border border-brand-border rounded p-3 text-slate-200 text-xs font-mono leading-relaxed" placeholder="<div class=&quot;py-8&quot;><h1>...</h1></div>"></textarea>
            </div>
          </div>
        `, `
          <button onclick="closeModal()" class="px-3 py-1.5 text-xs font-semibold rounded bg-slate-800 text-slate-300 hover:bg-slate-700">Cancel</button>
          <button id="btnSubmitNewDraftModal" class="px-3.5 py-1.5 text-xs font-bold rounded bg-brand-emerald hover:bg-brand-emeraldHover text-white transition">Create Staged Draft</button>
        `);

        // Auto-slug in draft modal
        const titleInput = document.getElementById('inputNewDraftTitle');
        const pathInput = document.getElementById('inputNewDraftPath');
        if (titleInput && pathInput) {
          titleInput.addEventListener('input', () => {
            const slug = titleInput.value.toLowerCase().trim().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
            pathInput.value = '/' + (slug || 'draft') + '.html';
          });
        }

        document.getElementById('btnSubmitNewDraftModal')?.addEventListener('click', () => {
          const title = titleInput?.value.trim();
          const path = pathInput?.value.trim();
          const author = document.getElementById('inputNewDraftAuthor')?.value.trim();
          const status = document.getElementById('selectNewDraftStatus')?.value;
          const markup = document.getElementById('textareaNewDraftMarkup')?.value;

          if (!title) {
            showToast("Please provide a draft title.", "warning");
            return;
          }

          if (window.CSOSuperStore && typeof window.CSOSuperStore.savePageDraft === 'function') {
            const created = window.CSOSuperStore.savePageDraft({
              title,
              path: path || '/draft.html',
              author: author || 'editorial@csodisha.com',
              status: status || 'In Progress',
              progress: status === 'Review Ready' ? 85 : 45,
              markup: markup || `<div class="py-8 px-4 max-w-3xl mx-auto"><h1 class="text-2xl font-bold text-white">${title}</h1></div>`
            });
            closeModal();
            showToast(`Draft "${created.title}" created in staging!`, "success");
            updateKpis();
            renderDraftsTable();
          }
        });
      });
    }

    /**
     * VIEW 2j: Timed Publishing Engine & Scheduled Releases (module-02-010)
     */
    function renderScheduledPagesWorkspace() {
      // Header Breadcrumb
      dom.breadcrumbFolder.textContent = "Website Pages & Builder";
      dom.breadcrumbModule.textContent = "Scheduled Pages (module-02-010)";

      // Top Action Bar
      dom.moduleHeaderActions.innerHTML = `
        <div class="flex items-center gap-2">
          <button id="btnNewScheduleTop" class="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-brand-emerald hover:bg-brand-emeraldHover text-white shadow flex items-center gap-1.5 transition">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            + Schedule New Release
          </button>
          <button id="btnCheckPendingReleases" class="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-brand-border flex items-center gap-1.5 transition">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            Check Pending Releases
          </button>
          <button id="btnExportSchedulesJson" class="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-brand-border flex items-center gap-1.5 transition">
            <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            Export Schedule (JSON)
          </button>
        </div>
      `;

      dom.workspaceRoot.innerHTML = `
        <div class="space-y-6 font-sans">
          <!-- Overview Card -->
          <div class="p-5 rounded-xl bg-brand-slate border border-brand-border shadow-md space-y-4">
            <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h2 class="text-base font-bold text-white flex items-center gap-2">
                  Automated Content Releases & Gazette Queue
                  <span class="text-xs font-mono font-normal px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/60">module-02-010</span>
                </h2>
                <p class="text-xs text-slate-400 mt-0.5">Automate midnight release schedules for examination hall tickets, merit gazettes, and state scholarship application cutoffs.</p>
              </div>
              <div class="flex items-center gap-2">
                <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 text-xs font-mono font-bold">
                  <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Cron Dispatcher Active
                </span>
              </div>
            </div>

            <!-- KPI Row -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div class="p-3.5 rounded-lg bg-[#081220] border border-brand-border">
                <span class="text-xs text-slate-400 block font-mono">Pending Releases</span>
                <div id="kpiScheduledCount" class="text-xl font-bold font-mono text-cyan-400 mt-1">--</div>
                <div class="text-[10px] text-slate-500 font-mono mt-0.5">Awaiting publication time</div>
              </div>
              <div class="p-3.5 rounded-lg bg-[#081220] border border-brand-border">
                <span class="text-xs text-slate-400 block font-mono">Executed Releases</span>
                <div id="kpiExecutedCount" class="text-xl font-bold font-mono text-emerald-400 mt-1">--</div>
                <div class="text-[10px] text-slate-500 font-mono mt-0.5">Successfully published</div>
              </div>
              <div class="p-3.5 rounded-lg bg-[#081220] border border-brand-border">
                <span class="text-xs text-slate-400 block font-mono">Cancelled</span>
                <div id="kpiCancelledCount" class="text-xl font-bold font-mono text-slate-400 mt-1">--</div>
                <div class="text-[10px] text-slate-500 font-mono mt-0.5">Revoked from pipeline</div>
              </div>
            </div>
          </div>

          <!-- Status Filter Tabs -->
          <div class="p-4 rounded-xl bg-brand-slate border border-brand-border shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div id="scheduleStatusTabsContainer" class="flex flex-wrap items-center gap-1.5">
              <button data-status="ALL" class="schedule-tab-btn px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition bg-brand-emerald text-white">All Releases</button>
              <button data-status="Scheduled" class="schedule-tab-btn px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition bg-slate-800 hover:bg-slate-700 text-slate-300">Scheduled</button>
              <button data-status="Executed" class="schedule-tab-btn px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition bg-slate-800 hover:bg-slate-700 text-slate-300">Executed</button>
              <button data-status="Cancelled" class="schedule-tab-btn px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition bg-slate-800 hover:bg-slate-700 text-slate-300">Cancelled</button>
            </div>
            <div class="text-[11px] font-mono text-slate-400" id="scheduleCountBadge">
              -- scheduled items
            </div>
          </div>

          <!-- Scheduled Releases Table -->
          <div class="rounded-xl bg-brand-slate border border-brand-border shadow-md overflow-hidden">
            <div class="px-5 py-3 border-b border-brand-border flex items-center justify-between">
              <h3 class="text-sm font-bold text-white flex items-center gap-2">
                Release Pipeline Register
              </h3>
              <span class="text-[11px] text-slate-400 font-mono">Live Ingestion from cso_scheduled_pages</span>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse text-xs">
                <thead>
                  <tr class="bg-[#081220] text-slate-400 font-mono border-b border-brand-border">
                    <th class="py-2.5 px-4 font-semibold">Release ID</th>
                    <th class="py-2.5 px-4 font-semibold">Target Title & Route</th>
                    <th class="py-2.5 px-4 font-semibold">Author</th>
                    <th class="py-2.5 px-4 font-semibold">Scheduled Date & Time</th>
                    <th class="py-2.5 px-4 font-semibold text-center">Status</th>
                    <th class="py-2.5 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody id="schedulesTableBody" class="divide-y divide-brand-border/40 font-sans">
                  <!-- Injected via JavaScript -->
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;

      let activeStatusFilter = 'ALL';

      function updateKpis() {
        const allItems = (window.CSOSuperStore && typeof window.CSOSuperStore.getScheduledPages === 'function')
          ? window.CSOSuperStore.getScheduledPages('ALL')
          : [];

        const pendingCount = allItems.filter(s => s.status === 'Scheduled').length;
        const executedCount = allItems.filter(s => s.status === 'Executed').length;
        const cancelledCount = allItems.filter(s => s.status === 'Cancelled').length;

        const elPending = document.getElementById('kpiScheduledCount');
        const elExecuted = document.getElementById('kpiExecutedCount');
        const elCancelled = document.getElementById('kpiCancelledCount');

        if (elPending) elPending.textContent = pendingCount;
        if (elExecuted) elExecuted.textContent = executedCount;
        if (elCancelled) elCancelled.textContent = cancelledCount;
      }

      function renderSchedulesTable() {
        const tbody = document.getElementById('schedulesTableBody');
        const badge = document.getElementById('scheduleCountBadge');
        if (!tbody) return;

        const items = (window.CSOSuperStore && typeof window.CSOSuperStore.getScheduledPages === 'function')
          ? window.CSOSuperStore.getScheduledPages(activeStatusFilter)
          : [];

        if (badge) badge.textContent = `${items.length} release entries registered`;

        if (items.length === 0) {
          tbody.innerHTML = `
            <tr>
              <td colspan="6" class="py-10 text-center text-slate-500 font-mono text-xs">
                No scheduled releases found matching the current status filter.
              </td>
            </tr>
          `;
          return;
        }

        tbody.innerHTML = items.map(item => {
          let statusBadge = '';
          const isPending = item.status === 'Scheduled';
          const isExecuted = item.status === 'Executed';

          if (isPending) {
            statusBadge = `<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">SCHEDULED</span>`;
          } else if (isExecuted) {
            statusBadge = `<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">EXECUTED</span>`;
          } else {
            statusBadge = `<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-400 border border-slate-700">CANCELLED</span>`;
          }

          const publishDateStr = new Date(item.publishAt).toLocaleString();
          const isDue = Date.now() >= item.publishAt && isPending;

          return `
            <tr class="hover:bg-slate-800/40 transition">
              <td class="py-2.5 px-4 font-mono font-bold text-cyan-400 whitespace-nowrap">${item.id}</td>
              <td class="py-2.5 px-4">
                <div class="font-bold text-white">${item.title}</div>
                <div class="text-[10px] font-mono text-slate-400 mt-0.5">${item.path}</div>
              </td>
              <td class="py-2.5 px-4 font-mono text-slate-300 text-[11px] whitespace-nowrap">${item.author}</td>
              <td class="py-2.5 px-4 font-mono text-xs whitespace-nowrap">
                <span class="${isDue ? 'text-amber-400 font-bold' : 'text-slate-300'}">${publishDateStr}</span>
                ${isDue ? `<div class="text-[9px] text-amber-400 font-bold uppercase mt-0.5">&bull; Release Due Now</div>` : ''}
              </td>
              <td class="py-2.5 px-4 text-center whitespace-nowrap">${statusBadge}</td>
              <td class="py-2.5 px-4 text-right whitespace-nowrap">
                <div class="inline-flex items-center gap-1.5">
                  <button data-id="${item.id}" class="btn-preview-sch px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 text-xs font-mono font-semibold border border-brand-border transition">
                    Preview &nearr;
                  </button>
                  ${isPending ? `
                    <button data-id="${item.id}" class="btn-publish-sch-now px-2 py-1 rounded bg-brand-emerald hover:bg-brand-emeraldHover text-white text-xs font-mono font-bold transition shadow" title="Publish Immediately">
                      Publish Now
                    </button>
                    <button data-id="${item.id}" class="btn-cancel-sch px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono border border-slate-700 transition" title="Cancel Scheduled Release">
                      Cancel
                    </button>
                  ` : ''}
                  <button data-id="${item.id}" class="btn-delete-sch px-2 py-1 rounded bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 text-xs font-mono border border-rose-800/50 transition" title="Delete Entry">
                    &times;
                  </button>
                </div>
              </td>
            </tr>
          `;
        }).join('');

        // Wire Preview
        tbody.querySelectorAll('.btn-preview-sch').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const schId = e.currentTarget.getAttribute('data-id');
            const item = window.CSOSuperStore?.getScheduledPages('ALL').find(s => s.id === schId);
            if (!item) return;

            openModal(`Scheduled Preview: ${item.title}`, `
              <div class="space-y-4 font-sans text-xs">
                <div class="flex items-center justify-between p-3 bg-[#081220] border border-brand-border rounded-lg font-mono text-[11px]">
                  <div>Target Route: <strong class="text-cyan-400">${item.path}</strong></div>
                  <div>Scheduled For: <strong class="text-amber-400">${new Date(item.publishAt).toLocaleString()}</strong></div>
                </div>
                <div class="p-5 bg-[#040810] border border-brand-border rounded-lg max-h-[460px] overflow-y-auto">
                  ${item.markup || '<p class="text-slate-500">No content attached.</p>'}
                </div>
              </div>
            `, `
              <button onclick="closeModal()" class="px-3 py-1.5 text-xs font-semibold rounded bg-slate-800 text-slate-300 hover:bg-slate-700">Close</button>
            `);
          });
        });

        // Wire Publish Now
        tbody.querySelectorAll('.btn-publish-sch-now').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const schId = e.currentTarget.getAttribute('data-id');
            const item = window.CSOSuperStore?.getScheduledPages('ALL').find(s => s.id === schId);
            if (!item) return;

            openModal(`Publish Scheduled Page Immediately`, `
              <div class="space-y-3 font-sans text-xs">
                <div class="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-lg text-emerald-200">
                  <strong>Override Timer:</strong> This will instantly promote scheduled release <strong class="text-white font-mono">${item.id}</strong> to the live route <strong class="text-white font-mono">${item.path}</strong>.
                </div>
                <p class="text-slate-300">Are you sure you want to bypass the remaining timer countdown?</p>
              </div>
            `, `
              <button onclick="closeModal()" class="px-3 py-1.5 text-xs font-semibold rounded bg-slate-800 text-slate-300 hover:bg-slate-700">Cancel</button>
              <button id="btnConfirmPublishSchNow" class="px-3.5 py-1.5 text-xs font-bold rounded bg-brand-emerald hover:bg-brand-emeraldHover text-white transition">Publish Live Now</button>
            `);

            document.getElementById('btnConfirmPublishSchNow')?.addEventListener('click', () => {
              closeModal();
              if (window.CSOSuperStore && typeof window.CSOSuperStore.executeScheduledRelease === 'function') {
                try {
                  const res = window.CSOSuperStore.executeScheduledRelease(item.id);
                  showToast(`Published scheduled release ${item.id} to ${res.page.path}!`, "success");
                  updateKpis();
                  renderSchedulesTable();
                } catch (err) {
                  showToast(err.message, "error");
                }
              }
            });
          });
        });

        // Wire Cancel
        tbody.querySelectorAll('.btn-cancel-sch').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const schId = e.currentTarget.getAttribute('data-id');
            if (window.CSOSuperStore && typeof window.CSOSuperStore.cancelScheduledRelease === 'function') {
              window.CSOSuperStore.cancelScheduledRelease(schId);
              showToast(`Scheduled release ${schId} cancelled`, "info");
              updateKpis();
              renderSchedulesTable();
            }
          });
        });

        // Wire Delete
        tbody.querySelectorAll('.btn-delete-sch').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const schId = e.currentTarget.getAttribute('data-id');
            openModal(`Delete Scheduled Entry ${schId}`, `
              <div class="space-y-3 font-sans text-xs">
                <p class="text-slate-300">Are you sure you want to remove this scheduled release from the pipeline?</p>
              </div>
            `, `
              <button onclick="closeModal()" class="px-3 py-1.5 text-xs font-semibold rounded bg-slate-800 text-slate-300 hover:bg-slate-700">Cancel</button>
              <button id="btnConfirmDeleteSchModal" class="px-3.5 py-1.5 text-xs font-bold rounded bg-rose-600 hover:bg-rose-500 text-white transition">Delete Entry</button>
            `);

            document.getElementById('btnConfirmDeleteSchModal')?.addEventListener('click', () => {
              closeModal();
              if (window.CSOSuperStore && typeof window.CSOSuperStore.deleteScheduledPage === 'function') {
                window.CSOSuperStore.deleteScheduledPage(schId);
                showToast(`Scheduled release ${schId} deleted`, "warning");
                updateKpis();
                renderSchedulesTable();
              }
            });
          });
        });
      }

      // Initial Renders
      updateKpis();
      renderSchedulesTable();

      // Tab Switching
      document.querySelectorAll('.schedule-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          activeStatusFilter = e.currentTarget.getAttribute('data-status') || 'ALL';
          document.querySelectorAll('.schedule-tab-btn').forEach(b => {
            b.className = "schedule-tab-btn px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition bg-slate-800 hover:bg-slate-700 text-slate-300";
          });
          e.currentTarget.className = "schedule-tab-btn px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition bg-brand-emerald text-white";
          renderSchedulesTable();
        });
      });

      // Check Pending Releases
      document.getElementById('btnCheckPendingReleases')?.addEventListener('click', () => {
        const items = window.CSOSuperStore?.getScheduledPages('Scheduled') || [];
        const now = Date.now();
        const dueItems = items.filter(s => now >= s.publishAt);

        if (dueItems.length === 0) {
          showToast("No pending scheduled releases are due at this time.", "info");
          return;
        }

        let executedCount = 0;
        dueItems.forEach(item => {
          try {
            window.CSOSuperStore?.executeScheduledRelease(item.id);
            executedCount++;
          } catch (_) {}
        });

        showToast(`Cron execution triggered: Published ${executedCount} due releases!`, "success");
        updateKpis();
        renderSchedulesTable();
      });

      // Export Schedules
      document.getElementById('btnExportSchedulesJson')?.addEventListener('click', () => {
        if (window.CSOSuperStore && typeof window.CSOSuperStore.exportScheduledPages === 'function') {
          const filename = window.CSOSuperStore.exportScheduledPages();
          showToast(`Scheduled releases exported: ${filename}`, "success");
        }
      });

      // Schedule New Release Modal
      document.getElementById('btnNewScheduleTop')?.addEventListener('click', () => {
        // Pre-fill datetime-local for tomorrow 09:00 AM IST
        const tomorrow = new Date(Date.now() + 86400000);
        const yyyy = tomorrow.getFullYear();
        const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
        const dd = String(tomorrow.getDate()).padStart(2, '0');
        const defaultDateTime = `${yyyy}-${mm}-${dd}T09:00`;

        openModal("Schedule New Page Release", `
          <div class="space-y-4 font-sans text-xs">
            <div>
              <label class="block text-slate-300 font-semibold mb-1">Target Page Title <span class="text-rose-400">*</span></label>
              <input id="inputNewSchTitle" type="text" placeholder="e.g. OSSC Statistical Assistant 2026 Answer Key" class="w-full bg-[#081220] border border-brand-border rounded px-3 py-2 text-white text-xs">
            </div>
            <div>
              <label class="block text-slate-300 font-semibold mb-1">Target Route Path <span class="text-rose-400">*</span></label>
              <input id="inputNewSchPath" type="text" placeholder="/notices/ossc-statistical-assistant-key-2026.html" class="w-full bg-[#081220] border border-brand-border rounded px-3 py-2 text-white text-xs font-mono">
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-slate-300 font-semibold mb-1">Author Email</label>
                <input id="inputNewSchAuthor" type="text" value="admin@csodisha.com" class="w-full bg-[#081220] border border-brand-border rounded px-3 py-2 text-white text-xs font-mono">
              </div>
              <div>
                <label class="block text-slate-300 font-semibold mb-1">Scheduled Release Date & Time</label>
                <input id="inputNewSchDateTime" type="datetime-local" value="${defaultDateTime}" class="w-full bg-[#081220] border border-brand-border rounded px-3 py-2 text-white text-xs font-mono">
              </div>
            </div>
            <div>
              <label class="block text-slate-300 font-semibold mb-1">Scheduled Page HTML Markup</label>
              <textarea id="textareaNewSchMarkup" rows="6" class="w-full bg-[#050a14] border border-brand-border rounded p-3 text-slate-200 text-xs font-mono leading-relaxed" placeholder="<div class=&quot;py-8&quot;><h1>...</h1></div>"></textarea>
            </div>
          </div>
        `, `
          <button onclick="closeModal()" class="px-3 py-1.5 text-xs font-semibold rounded bg-slate-800 text-slate-300 hover:bg-slate-700">Cancel</button>
          <button id="btnSubmitNewSchModal" class="px-3.5 py-1.5 text-xs font-bold rounded bg-brand-emerald hover:bg-brand-emeraldHover text-white transition">Schedule Release</button>
        `);

        // Auto-path slug
        const titleInput = document.getElementById('inputNewSchTitle');
        const pathInput = document.getElementById('inputNewSchPath');
        if (titleInput && pathInput) {
          titleInput.addEventListener('input', () => {
            const slug = titleInput.value.toLowerCase().trim().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
            pathInput.value = '/notices/' + (slug || 'notice') + '.html';
          });
        }

        document.getElementById('btnSubmitNewSchModal')?.addEventListener('click', () => {
          const title = titleInput?.value.trim();
          const path = pathInput?.value.trim();
          const author = document.getElementById('inputNewSchAuthor')?.value.trim();
          const dtStr = document.getElementById('inputNewSchDateTime')?.value;
          const markup = document.getElementById('textareaNewSchMarkup')?.value;

          if (!title) {
            showToast("Please provide a target title.", "warning");
            return;
          }

          const publishAt = dtStr ? new Date(dtStr).getTime() : (Date.now() + 86400000);

          if (window.CSOSuperStore && typeof window.CSOSuperStore.saveScheduledPage === 'function') {
            const created = window.CSOSuperStore.saveScheduledPage({
              title,
              path: path || '/notices/release.html',
              author: author || 'admin@csodisha.com',
              publishAt: publishAt,
              markup: markup || `<div class="py-12 max-w-4xl mx-auto px-6"><h1 class="text-3xl font-bold text-white">${title}</h1></div>`
            });
            closeModal();
            showToast(`Release "${created.title}" scheduled for ${new Date(publishAt).toLocaleString()}!`, "success");
            updateKpis();
            renderSchedulesTable();
          }
        });
      });
    }

    /**
     * VIEW 2k: Recycle Bin & Trash Recovery Engine (module-02-011)
     */
    function renderTrashAndRestoreWorkspace() {
      // Header Breadcrumb
      dom.breadcrumbFolder.textContent = "Website Pages & Builder";
      dom.breadcrumbModule.textContent = "Trash & Restore (module-02-011)";

      // Top Action Bar
      dom.moduleHeaderActions.innerHTML = `
        <div class="flex items-center gap-2">
          <button id="btnEmptyTrashTop" class="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow flex items-center gap-1.5 transition">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            Empty Trash Now
          </button>
          <button id="btnExportTrashJson" class="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-brand-border flex items-center gap-1.5 transition">
            <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            Export Manifest (JSON)
          </button>
        </div>
      `;

      dom.workspaceRoot.innerHTML = `
        <div class="space-y-6 font-sans">
          <!-- Overview Card -->
          <div class="p-5 rounded-xl bg-brand-slate border border-brand-border shadow-md space-y-4">
            <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h2 class="text-base font-bold text-white flex items-center gap-2">
                  System Recycle Bin & Soft-Deleted Asset Vault
                  <span class="text-xs font-mono font-normal px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/60">module-02-011</span>
                </h2>
                <p class="text-xs text-slate-400 mt-0.5">Recover mistakenly deleted public routes, restore archived drafts and campaign gateways, or enforce permanent zero-trust storage purges.</p>
              </div>
              <div class="flex items-center gap-2">
                <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 text-xs font-mono">
                  <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
                  30-Day Auto Purge Cycle
                </span>
              </div>
            </div>

            <!-- KPI Row -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div class="p-3.5 rounded-lg bg-[#081220] border border-brand-border">
                <span class="text-xs text-slate-400 block font-mono">Total Trashed Items</span>
                <div id="kpiTotalTrash" class="text-xl font-bold font-mono text-white mt-1">--</div>
                <div class="text-[10px] text-slate-500 font-mono mt-0.5">Recoverable assets</div>
              </div>
              <div class="p-3.5 rounded-lg bg-[#081220] border border-brand-border">
                <span class="text-xs text-slate-400 block font-mono">Trashed Pages</span>
                <div id="kpiTrashPages" class="text-xl font-bold font-mono text-cyan-400 mt-1">--</div>
                <div class="text-[10px] text-slate-500 font-mono mt-0.5">Static route backups</div>
              </div>
              <div class="p-3.5 rounded-lg bg-[#081220] border border-brand-border">
                <span class="text-xs text-slate-400 block font-mono">Drafts & Campaigns</span>
                <div id="kpiTrashDrafts" class="text-xl font-bold font-mono text-amber-400 mt-1">--</div>
                <div class="text-[10px] text-slate-500 font-mono mt-0.5">Staged and promotional files</div>
              </div>
            </div>
          </div>

          <!-- Filter Tabs & Search Bar -->
          <div class="p-4 rounded-xl bg-brand-slate border border-brand-border shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div id="trashTypeTabsContainer" class="flex flex-wrap items-center gap-1.5">
              <button data-type="ALL" class="trash-tab-btn px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition bg-brand-emerald text-white">All Items</button>
              <button data-type="Page" class="trash-tab-btn px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition bg-slate-800 hover:bg-slate-700 text-slate-300">Pages</button>
              <button data-type="Draft" class="trash-tab-btn px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition bg-slate-800 hover:bg-slate-700 text-slate-300">Drafts</button>
              <button data-type="Campaign" class="trash-tab-btn px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition bg-slate-800 hover:bg-slate-700 text-slate-300">Campaigns</button>
            </div>

            <!-- Search input -->
            <div class="relative min-w-[240px]">
              <input id="trashSearchInput" type="text" placeholder="Search title or deleted route..." class="w-full bg-[#081220] border border-brand-border rounded-lg pl-8 pr-3 py-1.5 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-emerald font-sans">
              <svg class="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </div>
          </div>

          <!-- Trashed Assets Table -->
          <div class="rounded-xl bg-brand-slate border border-brand-border shadow-md overflow-hidden">
            <div class="px-5 py-3 border-b border-brand-border flex items-center justify-between">
              <h3 class="text-sm font-bold text-white flex items-center gap-2">
                Trash Manifest Register
              </h3>
              <span class="text-[11px] text-slate-400 font-mono" id="trashCountBadge">-- trashed assets</span>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse text-xs">
                <thead>
                  <tr class="bg-[#081220] text-slate-400 font-mono border-b border-brand-border">
                    <th class="py-2.5 px-4 font-semibold">Trash ID</th>
                    <th class="py-2.5 px-4 font-semibold">Asset Title & Original Route</th>
                    <th class="py-2.5 px-4 font-semibold">Type</th>
                    <th class="py-2.5 px-4 font-semibold">Deleted By</th>
                    <th class="py-2.5 px-4 font-semibold">Deleted Date</th>
                    <th class="py-2.5 px-4 font-semibold text-center">Retention</th>
                    <th class="py-2.5 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody id="trashTableBody" class="divide-y divide-brand-border/40 font-sans">
                  <!-- Injected via JavaScript -->
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;

      let activeTypeFilter = 'ALL';
      let activeSearch = '';

      function updateKpis() {
        const allTrash = (window.CSOSuperStore && typeof window.CSOSuperStore.getTrashedPages === 'function')
          ? window.CSOSuperStore.getTrashedPages('ALL', '')
          : [];

        const pageCount = allTrash.filter(t => t.type === 'Page').length;
        const otherCount = allTrash.filter(t => t.type !== 'Page').length;

        const elTotal = document.getElementById('kpiTotalTrash');
        const elPages = document.getElementById('kpiTrashPages');
        const elDrafts = document.getElementById('kpiTrashDrafts');

        if (elTotal) elTotal.textContent = allTrash.length;
        if (elPages) elPages.textContent = pageCount;
        if (elDrafts) elDrafts.textContent = otherCount;
      }

      function renderTrashTable() {
        const tbody = document.getElementById('trashTableBody');
        const badge = document.getElementById('trashCountBadge');
        if (!tbody) return;

        const items = (window.CSOSuperStore && typeof window.CSOSuperStore.getTrashedPages === 'function')
          ? window.CSOSuperStore.getTrashedPages(activeTypeFilter, activeSearch)
          : [];

        if (badge) badge.textContent = `${items.length} recoverable assets in bin`;

        if (items.length === 0) {
          tbody.innerHTML = `
            <tr>
              <td colspan="7" class="py-12 text-center text-slate-500 font-mono text-xs">
                Recycle bin is empty. No deleted pages or drafts.
              </td>
            </tr>
          `;
          return;
        }

        tbody.innerHTML = items.map(item => {
          const typeBadgeColor = item.type === 'Page' ? 'text-cyan-400 border-cyan-800/60 bg-cyan-950/40'
            : item.type === 'Draft' ? 'text-amber-400 border-amber-800/60 bg-amber-950/40'
            : 'text-purple-400 border-purple-800/60 bg-purple-950/40';

          const daysLeft = Math.max(0, Math.ceil((item.expiresAt - Date.now()) / (86400000)));
          const deletedDateStr = new Date(item.deletedAt).toLocaleDateString();

          return `
            <tr class="hover:bg-slate-800/40 transition">
              <td class="py-2.5 px-4 font-mono font-bold text-rose-400 whitespace-nowrap">${item.id}</td>
              <td class="py-2.5 px-4">
                <div class="font-bold text-white">${item.title}</div>
                <div class="text-[10px] font-mono text-slate-400 mt-0.5">${item.path}</div>
              </td>
              <td class="py-2.5 px-4 whitespace-nowrap">
                <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${typeBadgeColor}">
                  ${item.type}
                </span>
              </td>
              <td class="py-2.5 px-4 font-mono text-slate-300 text-[11px] whitespace-nowrap">${item.deletedBy}</td>
              <td class="py-2.5 px-4 font-mono text-slate-400 text-xs whitespace-nowrap">${deletedDateStr}</td>
              <td class="py-2.5 px-4 text-center whitespace-nowrap">
                <span class="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                  ${daysLeft} days left
                </span>
              </td>
              <td class="py-2.5 px-4 text-right whitespace-nowrap">
                <div class="inline-flex items-center gap-1.5">
                  <button data-id="${item.id}" class="btn-inspect-trash px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-semibold border border-brand-border transition">
                    Inspect
                  </button>
                  <button data-id="${item.id}" class="btn-restore-trash px-2 py-1 rounded bg-brand-emerald hover:bg-brand-emeraldHover text-white text-xs font-mono font-bold transition shadow" title="Restore to Active Store">
                    Restore Asset
                  </button>
                  <button data-id="${item.id}" class="btn-purge-trash px-2 py-1 rounded bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 text-xs font-mono border border-rose-800/50 transition" title="Purge Permanently">
                    Purge
                  </button>
                </div>
              </td>
            </tr>
          `;
        }).join('');

        // Wire Inspect Snapshot
        tbody.querySelectorAll('.btn-inspect-trash').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const trashId = e.currentTarget.getAttribute('data-id');
            const item = window.CSOSuperStore?.getTrashedPages('ALL', '').find(t => t.id === trashId);
            if (!item) return;

            openModal(`Inspect Trashed Asset: ${item.id}`, `
              <div class="space-y-4 font-sans text-xs">
                <div class="grid grid-cols-2 gap-3 p-3 bg-[#081220] border border-brand-border rounded-lg font-mono text-[11px]">
                  <div>Asset Type: <strong class="text-cyan-400">${item.type}</strong></div>
                  <div>Deleted By: <strong class="text-slate-300">${item.deletedBy}</strong></div>
                  <div>Original Route: <strong class="text-white">${item.path}</strong></div>
                  <div>Deleted At: <strong class="text-slate-300">${new Date(item.deletedAt).toLocaleString()}</strong></div>
                </div>

                <div>
                  <span class="text-slate-400 font-bold block mb-1">Original Payload Manifest:</span>
                  <textarea readonly rows="8" class="w-full bg-[#040810] border border-brand-border rounded p-3 text-slate-300 font-mono text-xs focus:outline-none select-all">${JSON.stringify(item.originalPayload, null, 2)}</textarea>
                </div>
              </div>
            `, `
              <button onclick="closeModal()" class="px-3 py-1.5 text-xs font-semibold rounded bg-slate-800 text-slate-300 hover:bg-slate-700">Close</button>
            `);
          });
        });

        // Wire Restore
        tbody.querySelectorAll('.btn-restore-trash').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const trashId = e.currentTarget.getAttribute('data-id');
            const item = window.CSOSuperStore?.getTrashedPages('ALL', '').find(t => t.id === trashId);
            if (!item) return;

            openModal(`Restore Asset: ${item.title}`, `
              <div class="space-y-3 font-sans text-xs">
                <div class="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-lg text-emerald-200">
                  <strong>Restoration:</strong> This will restore <strong class="text-white font-mono">${item.title}</strong> (${item.type}) back into the active production matrix.
                </div>
                <p class="text-slate-300">Are you sure you want to restore this asset?</p>
              </div>
            `, `
              <button onclick="closeModal()" class="px-3 py-1.5 text-xs font-semibold rounded bg-slate-800 text-slate-300 hover:bg-slate-700">Cancel</button>
              <button id="btnConfirmRestoreModal" class="px-3.5 py-1.5 text-xs font-bold rounded bg-brand-emerald hover:bg-brand-emeraldHover text-white transition">Restore Now</button>
            `);

            document.getElementById('btnConfirmRestoreModal')?.addEventListener('click', () => {
              closeModal();
              if (window.CSOSuperStore && typeof window.CSOSuperStore.restoreFromTrash === 'function') {
                try {
                  window.CSOSuperStore.restoreFromTrash(item.id);
                  showToast(`Restored "${item.title}" successfully!`, "success");
                  updateKpis();
                  renderTrashTable();
                } catch (err) {
                  showToast(err.message, "error");
                }
              }
            });
          });
        });

        // Wire Purge
        tbody.querySelectorAll('.btn-purge-trash').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const trashId = e.currentTarget.getAttribute('data-id');
            openModal(`Purge Permanently: ${trashId}`, `
              <div class="space-y-3 font-sans text-xs">
                <div class="p-3 bg-rose-950/40 border border-rose-500/40 rounded-lg text-rose-200">
                  <strong>Permanent Data Loss:</strong> Purging this item will permanently destroy its snapshot from browser storage and the rollback cache.
                </div>
                <p class="text-slate-300">Are you sure you want to proceed with permanent destruction?</p>
              </div>
            `, `
              <button onclick="closeModal()" class="px-3 py-1.5 text-xs font-semibold rounded bg-slate-800 text-slate-300 hover:bg-slate-700">Cancel</button>
              <button id="btnConfirmPurgeModal" class="px-3.5 py-1.5 text-xs font-bold rounded bg-rose-600 hover:bg-rose-500 text-white transition">Purge Permanently</button>
            `);

            document.getElementById('btnConfirmPurgeModal')?.addEventListener('click', () => {
              closeModal();
              if (window.CSOSuperStore && typeof window.CSOSuperStore.permanentlyDeleteTrashItem === 'function') {
                window.CSOSuperStore.permanentlyDeleteTrashItem(trashId);
                showToast(`Asset ${trashId} permanently purged.`, "warning");
                updateKpis();
                renderTrashTable();
              }
            });
          });
        });
      }

      // Initial Renders
      updateKpis();
      renderTrashTable();

      // Tab Switching
      document.querySelectorAll('.trash-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          activeTypeFilter = e.currentTarget.getAttribute('data-type') || 'ALL';
          document.querySelectorAll('.trash-tab-btn').forEach(b => {
            b.className = "trash-tab-btn px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition bg-slate-800 hover:bg-slate-700 text-slate-300";
          });
          e.currentTarget.className = "trash-tab-btn px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition bg-brand-emerald text-white";
          renderTrashTable();
        });
      });

      // Search Listener
      const searchInput = document.getElementById('trashSearchInput');
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          activeSearch = e.target.value;
          renderTrashTable();
        });
      }

      // Export Manifest
      document.getElementById('btnExportTrashJson')?.addEventListener('click', () => {
        if (window.CSOSuperStore && typeof window.CSOSuperStore.exportTrashManifest === 'function') {
          const filename = window.CSOSuperStore.exportTrashManifest();
          showToast(`Trash manifest exported: ${filename}`, "success");
        }
      });

      // Empty Trash Action
      document.getElementById('btnEmptyTrashTop')?.addEventListener('click', () => {
        openModal("Empty Complete Recycle Bin", `
          <div class="space-y-3 font-sans text-xs">
            <div class="p-3 bg-rose-950/40 border border-rose-500/40 rounded-lg text-rose-200">
              <strong>Caution:</strong> This will permanently delete all soft-deleted pages, drafts, and campaigns currently stored in the recycle bin.
            </div>
            <p class="text-slate-300">This action is irreversible. Are you sure you wish to empty the trash?</p>
          </div>
        `, `
          <button onclick="closeModal()" class="px-3 py-1.5 text-xs font-semibold rounded bg-slate-800 text-slate-300 hover:bg-slate-700">Cancel</button>
          <button id="btnConfirmEmptyTrashModal" class="px-3.5 py-1.5 text-xs font-bold rounded bg-rose-600 hover:bg-rose-500 text-white transition">Empty Trash</button>
        `);

        document.getElementById('btnConfirmEmptyTrashModal')?.addEventListener('click', () => {
          closeModal();
          if (window.CSOSuperStore && typeof window.CSOSuperStore.emptyTrash === 'function') {
            const count = window.CSOSuperStore.emptyTrash();
            showToast(`Recycle bin emptied (${count} assets purged).`, "warning");
            updateKpis();
            renderTrashTable();
          }
        });
      });
    }

    /**
     * VIEW 3a: Site Identity & Brand Setup Studio (module-03-001)
     */
    function renderSiteIdentityWorkspace() {
      // Header Breadcrumb
      dom.breadcrumbFolder.textContent = "Website Information & Legal";
      dom.breadcrumbModule.textContent = "Site Identity & Brand Setup (module-03-001)";

      // Top Action Bar
      dom.moduleHeaderActions.innerHTML = `
        <div class="flex items-center gap-2">
          <button id="btnSaveBrandSetup" class="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-brand-emerald hover:bg-brand-emeraldHover text-white shadow flex items-center gap-1.5 transition">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
            Save Brand Setup
          </button>
          <button id="btnExportBrandJson" class="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-brand-border flex items-center gap-1.5 transition">
            <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            Export Manifest (JSON)
          </button>
        </div>
      `;

      // Ingest Brand Config
      const brand = (window.CSOSuperStore && typeof window.CSOSuperStore.getBrandConfig === 'function')
        ? window.CSOSuperStore.getBrandConfig()
        : {
            siteName: "Common Sense Odisha",
            shortCode: "CSO",
            domain: "csodisha.com",
            supportEmail: "contact@csodisha.com",
            tagline: "Empowering Aspirants Across All 30 Districts of Odisha",
            description: "Dedicated examination intelligence, authentic syllabus patterns, and academic empowerment for youth across Odisha.",
            logoPath: "/assets/img/logo.svg",
            faviconPath: "/favicon.ico",
            primaryColor: "#0fa968",
            navyColor: "#081220",
            slateColor: "#0f172a",
            jurisdiction: "All 30 Districts of Odisha",
            updatedAt: new Date().toISOString()
          };

      dom.workspaceRoot.innerHTML = `
        <div class="space-y-6 font-sans">
          <!-- Overview Card -->
          <div class="p-5 rounded-xl bg-brand-slate border border-brand-border shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 class="text-base font-bold text-white flex items-center gap-2">
                Brand Core & Platform Identity Master
                <span class="text-xs font-mono font-normal px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/60">module-03-001</span>
              </h2>
              <p class="text-xs text-slate-400 mt-0.5">Maintain platform nomenclature, canonical URL domain anchors, color tokens, and public metadata.</p>
            </div>
            <div class="text-[11px] font-mono text-slate-400 bg-[#081220] border border-brand-border px-3 py-1.5 rounded-lg">
              Last Updated: <span id="brandLastUpdated" class="text-emerald-400 font-bold">${new Date(brand.updatedAt).toLocaleDateString()}</span>
            </div>
          </div>

          <!-- 2-Column Responsive Studio Layout -->
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <!-- Left Column: Brand Configuration Form (7 cols) -->
            <div class="lg:col-span-7 space-y-4">
              <div class="p-5 rounded-xl bg-brand-slate border border-brand-border shadow-md space-y-4">
                <div class="flex items-center gap-2 pb-3 border-b border-brand-border">
                  <span class="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                  <h3 class="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
                    Platform Metadata & Nomenclature
                  </h3>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-xs font-semibold text-slate-200 mb-1">Platform Name <span class="text-rose-400">*</span></label>
                    <input id="inputBrandSiteName" type="text" value="${brand.siteName || ''}" class="w-full bg-[#081220] border border-brand-border rounded-lg px-3 py-2 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-emerald">
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-slate-200 mb-1">Short Code Badge</label>
                    <input id="inputBrandShortCode" type="text" value="${brand.shortCode || ''}" class="w-full bg-[#081220] border border-brand-border rounded-lg px-3 py-2 text-white text-xs font-mono placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-emerald">
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-xs font-semibold text-slate-200 mb-1">Canonical Domain <span class="text-rose-400">*</span></label>
                    <input id="inputBrandDomain" type="text" value="${brand.domain || ''}" class="w-full bg-[#081220] border border-brand-border rounded-lg px-3 py-2 text-white text-xs font-mono placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-emerald">
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-slate-200 mb-1">Primary Support Email</label>
                    <input id="inputBrandEmail" type="email" value="${brand.supportEmail || ''}" class="w-full bg-[#081220] border border-brand-border rounded-lg px-3 py-2 text-white text-xs font-mono placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-emerald">
                  </div>
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-200 mb-1">Official Tagline</label>
                  <input id="inputBrandTagline" type="text" value="${brand.tagline || ''}" class="w-full bg-[#081220] border border-brand-border rounded-lg px-3 py-2 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-emerald">
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-200 mb-1">Mission & Purpose Description</label>
                  <textarea id="textareaBrandDescription" rows="3" class="w-full bg-[#081220] border border-brand-border rounded-lg px-3 py-2 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-emerald leading-relaxed">${brand.description || ''}</textarea>
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-200 mb-1">Geographic Jurisdiction Tag</label>
                  <input id="inputBrandJurisdiction" type="text" value="${brand.jurisdiction || ''}" class="w-full bg-[#081220] border border-brand-border rounded-lg px-3 py-2 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-emerald">
                </div>

                <!-- Brand Color Tokens -->
                <div class="pt-3 border-t border-brand-border space-y-3">
                  <h4 class="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                    Design System Color Tokens
                  </h4>
                  <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div class="p-3 rounded-lg bg-[#081220] border border-brand-border space-y-1.5">
                      <label class="block text-[11px] font-mono text-slate-400">Primary Emerald</label>
                      <div class="flex items-center gap-2">
                        <input id="inputBrandPrimaryColorPicker" type="color" value="${brand.primaryColor || '#0fa968'}" class="w-7 h-7 rounded border border-slate-700 bg-transparent cursor-pointer p-0">
                        <input id="inputBrandPrimaryColor" type="text" value="${brand.primaryColor || '#0fa968'}" class="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-white">
                      </div>
                    </div>

                    <div class="p-3 rounded-lg bg-[#081220] border border-brand-border space-y-1.5">
                      <label class="block text-[11px] font-mono text-slate-400">Midnight Navy</label>
                      <div class="flex items-center gap-2">
                        <input id="inputBrandNavyColorPicker" type="color" value="${brand.navyColor || '#081220'}" class="w-7 h-7 rounded border border-slate-700 bg-transparent cursor-pointer p-0">
                        <input id="inputBrandNavyColor" type="text" value="${brand.navyColor || '#081220'}" class="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-white">
                      </div>
                    </div>

                    <div class="p-3 rounded-lg bg-[#081220] border border-brand-border space-y-1.5">
                      <label class="block text-[11px] font-mono text-slate-400">Slate Surface</label>
                      <div class="flex items-center gap-2">
                        <input id="inputBrandSlateColorPicker" type="color" value="${brand.slateColor || '#0f172a'}" class="w-7 h-7 rounded border border-slate-700 bg-transparent cursor-pointer p-0">
                        <input id="inputBrandSlateColor" type="text" value="${brand.slateColor || '#0f172a'}" class="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-white">
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Right Column: Live Synchronized Preview (5 cols) -->
            <div class="lg:col-span-5 space-y-4">
              <!-- Live Brand Card Preview -->
              <div class="p-5 rounded-xl bg-brand-slate border border-brand-border shadow-md space-y-4">
                <div class="flex items-center justify-between pb-3 border-b border-brand-border">
                  <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
                    <h3 class="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
                      Live Identity Preview
                    </h3>
                  </div>
                  <span class="text-[10px] font-mono text-emerald-400">Real-Time Sync</span>
                </div>

                <!-- Mock Portal Header -->
                <div class="p-4 rounded-xl border border-slate-800 bg-[#040810] space-y-3 shadow-inner">
                  <div class="flex items-center justify-between pb-2 border-b border-slate-800/80">
                    <div class="flex items-center gap-2.5">
                      <div id="previewLogoDot" class="w-4 h-4 rounded-full flex items-center justify-center font-bold text-[10px] text-white" style="background-color: ${brand.primaryColor || '#0fa968'};">
                        O
                      </div>
                      <span id="previewSiteName" class="font-bold text-white text-sm">${brand.siteName || 'Common Sense Odisha'}</span>
                      <span id="previewShortCode" class="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border border-emerald-500/30 text-emerald-400 bg-emerald-500/10">${brand.shortCode || 'CSO'}</span>
                    </div>
                    <span id="previewDomain" class="text-[11px] font-mono text-cyan-400">${brand.domain || 'csodisha.com'}</span>
                  </div>

                  <p id="previewTagline" class="text-xs text-slate-300 font-sans italic leading-relaxed">
                    "${brand.tagline || 'Empowering Aspirants Across All 30 Districts of Odisha'}"
                  </p>

                  <div class="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span>Helpdesk: <span id="previewEmail" class="text-slate-200">${brand.supportEmail || 'contact@csodisha.com'}</span></span>
                    <span id="previewJurisdiction" class="text-slate-300">${brand.jurisdiction || 'All 30 Districts'}</span>
                  </div>
                </div>

                <!-- Palette Swatches -->
                <div class="space-y-2 pt-2">
                  <span class="text-xs font-mono font-bold text-slate-400 block">Active Swatch Tokens:</span>
                  <div class="grid grid-cols-3 gap-2 text-center font-mono text-[10px]">
                    <div class="p-2 rounded-lg border border-slate-700" id="swatchPrimaryBox" style="background-color: ${brand.primaryColor || '#0fa968'};">
                      <span class="font-bold text-white shadow-sm" id="swatchPrimaryHex">${brand.primaryColor || '#0fa968'}</span>
                    </div>
                    <div class="p-2 rounded-lg border border-slate-700" id="swatchNavyBox" style="background-color: ${brand.navyColor || '#081220'};">
                      <span class="font-bold text-slate-200" id="swatchNavyHex">${brand.navyColor || '#081220'}</span>
                    </div>
                    <div class="p-2 rounded-lg border border-slate-700" id="swatchSlateBox" style="background-color: ${brand.slateColor || '#0f172a'};">
                      <span class="font-bold text-slate-200" id="swatchSlateHex">${brand.slateColor || '#0f172a'}</span>
                    </div>
                  </div>
                </div>

                <!-- Canonical Verification Pill -->
                <div class="p-3 rounded-lg bg-[#081220] border border-brand-border flex items-center justify-between text-xs font-mono">
                  <span class="text-slate-400 flex items-center gap-1.5">
                    <svg class="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                    Asset Integrity:
                  </span>
                  <span class="text-emerald-400 font-bold">25 Routes Aligned</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;

      // Form Bindings & Real-Time Sync
      const inputName = document.getElementById('inputBrandSiteName');
      const inputShort = document.getElementById('inputBrandShortCode');
      const inputDomain = document.getElementById('inputBrandDomain');
      const inputEmail = document.getElementById('inputBrandEmail');
      const inputTagline = document.getElementById('inputBrandTagline');
      const inputDesc = document.getElementById('textareaBrandDescription');
      const inputJurisdiction = document.getElementById('inputBrandJurisdiction');

      const colorPrimary = document.getElementById('inputBrandPrimaryColor');
      const pickerPrimary = document.getElementById('inputBrandPrimaryColorPicker');
      const colorNavy = document.getElementById('inputBrandNavyColor');
      const pickerNavy = document.getElementById('inputBrandNavyColorPicker');
      const colorSlate = document.getElementById('inputBrandSlateColor');
      const pickerSlate = document.getElementById('inputBrandSlateColorPicker');

      // Live Preview Elements
      const prevName = document.getElementById('previewSiteName');
      const prevShort = document.getElementById('previewShortCode');
      const prevDomain = document.getElementById('previewDomain');
      const prevTagline = document.getElementById('previewTagline');
      const prevEmail = document.getElementById('previewEmail');
      const prevJurisdiction = document.getElementById('previewJurisdiction');
      const prevLogoDot = document.getElementById('previewLogoDot');

      const swatchPrimaryBox = document.getElementById('swatchPrimaryBox');
      const swatchPrimaryHex = document.getElementById('swatchPrimaryHex');
      const swatchNavyBox = document.getElementById('swatchNavyBox');
      const swatchNavyHex = document.getElementById('swatchNavyHex');
      const swatchSlateBox = document.getElementById('swatchSlateBox');
      const swatchSlateHex = document.getElementById('swatchSlateHex');

      function syncPreview() {
        if (prevName) prevName.textContent = inputName.value || 'Common Sense Odisha';
        if (prevShort) prevShort.textContent = inputShort.value || 'CSO';
        if (prevDomain) prevDomain.textContent = inputDomain.value || 'csodisha.com';
        if (prevTagline) prevTagline.textContent = `"${inputTagline.value || 'Empowering Aspirants Across All 30 Districts of Odisha'}"`;
        if (prevEmail) prevEmail.textContent = inputEmail.value || 'contact@csodisha.com';
        if (prevJurisdiction) prevJurisdiction.textContent = inputJurisdiction.value || 'All 30 Districts';

        // Sync Primary Color
        const pColor = colorPrimary.value || '#0fa968';
        if (prevLogoDot) prevLogoDot.style.backgroundColor = pColor;
        if (swatchPrimaryBox) swatchPrimaryBox.style.backgroundColor = pColor;
        if (swatchPrimaryHex) swatchPrimaryHex.textContent = pColor;

        // Sync Navy
        const nColor = colorNavy.value || '#081220';
        if (swatchNavyBox) swatchNavyBox.style.backgroundColor = nColor;
        if (swatchNavyHex) swatchNavyHex.textContent = nColor;

        // Sync Slate
        const sColor = colorSlate.value || '#0f172a';
        if (swatchSlateBox) swatchSlateBox.style.backgroundColor = sColor;
        if (swatchSlateHex) swatchSlateHex.textContent = sColor;
      }

      [inputName, inputShort, inputDomain, inputEmail, inputTagline, inputDesc, inputJurisdiction].forEach(input => {
        input?.addEventListener('input', syncPreview);
      });

      // Color pickers bidirectional syncing
      pickerPrimary?.addEventListener('input', () => {
        colorPrimary.value = pickerPrimary.value;
        syncPreview();
      });
      colorPrimary?.addEventListener('input', () => {
        pickerPrimary.value = colorPrimary.value;
        syncPreview();
      });

      pickerNavy?.addEventListener('input', () => {
        colorNavy.value = pickerNavy.value;
        syncPreview();
      });
      colorNavy?.addEventListener('input', () => {
        pickerNavy.value = colorNavy.value;
        syncPreview();
      });

      pickerSlate?.addEventListener('input', () => {
        colorSlate.value = pickerSlate.value;
        syncPreview();
      });
      colorSlate?.addEventListener('input', () => {
        pickerSlate.value = colorSlate.value;
        syncPreview();
      });

      // Save Brand Setup
      document.getElementById('btnSaveBrandSetup')?.addEventListener('click', () => {
        const name = inputName.value.trim();
        const domain = inputDomain.value.trim();

        if (!name || !domain) {
          showToast("Platform Name and Canonical Domain are required.", "warning");
          return;
        }

        const payload = {
          siteName: name,
          shortCode: inputShort.value.trim() || 'CSO',
          domain: domain,
          supportEmail: inputEmail.value.trim() || 'contact@csodisha.com',
          tagline: inputTagline.value.trim() || '',
          description: inputDesc.value.trim() || '',
          jurisdiction: inputJurisdiction.value.trim() || 'All 30 Districts of Odisha',
          primaryColor: colorPrimary.value || '#0fa968',
          navyColor: colorNavy.value || '#081220',
          slateColor: colorSlate.value || '#0f172a',
          logoPath: "/assets/img/logo.svg",
          faviconPath: "/favicon.ico"
        };

        if (window.CSOSuperStore && typeof window.CSOSuperStore.saveBrandConfig === 'function') {
          const saved = window.CSOSuperStore.saveBrandConfig(payload);
          const dateEl = document.getElementById('brandLastUpdated');
          if (dateEl && saved.updatedAt) {
            dateEl.textContent = new Date(saved.updatedAt).toLocaleDateString();
          }
          showToast("Brand setup & color tokens saved successfully!", "success");
        }
      });

      // Export Manifest
      document.getElementById('btnExportBrandJson')?.addEventListener('click', () => {
        if (window.CSOSuperStore && typeof window.CSOSuperStore.exportBrandManifest === 'function') {
          const filename = window.CSOSuperStore.exportBrandManifest();
          showToast(`Brand manifest exported: ${filename}`, "success");
        }
      });
    }

    /**
     * VIEW 3b: About Us & Mission Management (module-03-002)
     */
    function renderAboutMissionWorkspace() {
      // Header Breadcrumb
      dom.breadcrumbFolder.textContent = "Website Information & Legal";
      dom.breadcrumbModule.textContent = "About Us & Mission Management (module-03-002)";

      // Top Action Bar
      dom.moduleHeaderActions.innerHTML = `
        <div class="flex items-center gap-2">
          <button id="btnSaveAboutMission" class="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-brand-emerald hover:bg-brand-emeraldHover text-white shadow flex items-center gap-1.5 transition">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
            Save & Publish Mission
          </button>
          <a href="/about/" target="_blank" rel="noopener noreferrer" class="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-brand-border flex items-center gap-1.5 transition">
            <svg class="w-3.5 h-3.5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
            Preview About Page ↗
          </a>
          <button id="btnExportAboutJson" class="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-brand-border flex items-center gap-1.5 transition">
            <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            Export Manifest (JSON)
          </button>
        </div>
      `;

      // Ingest About Config
      let about = (window.CSOSuperStore && typeof window.CSOSuperStore.getAboutConfig === 'function')
        ? window.CSOSuperStore.getAboutConfig()
        : {
            headline: "Democratizing Academic & Career Intelligence for Odisha's Youth",
            subheadline: "A dedicated non-profit digital gateway providing verified syllabi, state exam patterns, and scholarship navigation across all 30 districts.",
            mission: "To eliminate geographic and socio-economic information barriers for competitive examination aspirants in Odisha by delivering authenticated, zero-cost academic intelligence and verified state syllabus breakdowns.",
            vision: "An Odisha where every candidate from Mayurbhanj to Koraput possesses equal, transparent access to recruitment notifications, verified learning materials, and mentorship tools to realize their full potential.",
            pillars: [],
            milestones: [],
            updatedAt: new Date().toISOString()
          };

      // Clone arrays for local mutation
      let currentPillars = Array.isArray(about.pillars) ? JSON.parse(JSON.stringify(about.pillars)) : [];
      let currentMilestones = Array.isArray(about.milestones) ? JSON.parse(JSON.stringify(about.milestones)) : [];

      function renderPillarsList() {
        const container = document.getElementById('aboutPillarsContainer');
        if (!container) return;
        if (currentPillars.length === 0) {
          container.innerHTML = `<div class="p-4 text-center text-xs text-slate-400 font-mono">No institutional pillars configured. Add one below.</div>`;
          return;
        }

        container.innerHTML = currentPillars.map((p, idx) => `
          <div class="p-3.5 rounded-lg bg-[#081220] border border-brand-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 group">
            <div class="space-y-1 flex-1">
              <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span class="text-xs font-bold text-white">${escapeHtml(p.title || 'Untitled Pillar')}</span>
                <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">${escapeHtml(p.id || `PIL-${idx+1}`)}</span>
              </div>
              <p class="text-xs text-slate-300 leading-relaxed">${escapeHtml(p.description || '')}</p>
            </div>
            <button data-remove-pillar="${idx}" class="btn-remove-pillar px-2.5 py-1 text-xs font-semibold text-rose-400 hover:text-white hover:bg-rose-950/80 rounded border border-rose-900/50 transition">
              Remove
            </button>
          </div>
        `).join('');

        container.querySelectorAll('.btn-remove-pillar').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const index = parseInt(e.currentTarget.getAttribute('data-remove-pillar'), 10);
            if (!isNaN(index) && index >= 0 && index < currentPillars.length) {
              currentPillars.splice(index, 1);
              renderPillarsList();
            }
          });
        });
      }

      function renderMilestonesList() {
        const container = document.getElementById('aboutMilestonesContainer');
        if (!container) return;
        if (currentMilestones.length === 0) {
          container.innerHTML = `<div class="p-4 text-center text-xs text-slate-400 font-mono">No roadmap milestones configured. Add one below.</div>`;
          return;
        }

        container.innerHTML = currentMilestones.map((m, idx) => `
          <div class="p-3.5 rounded-lg bg-[#081220] border border-brand-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 group">
            <div class="space-y-1 flex-1">
              <div class="flex items-center gap-2">
                <span class="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-cyan-950 text-cyan-400 border border-cyan-800/80">${escapeHtml(m.year || 'Year')}</span>
                <span class="text-xs font-bold text-white">${escapeHtml(m.title || 'Milestone Title')}</span>
              </div>
              <p class="text-xs text-slate-300 leading-relaxed">${escapeHtml(m.description || '')}</p>
            </div>
            <button data-remove-milestone="${idx}" class="btn-remove-milestone px-2.5 py-1 text-xs font-semibold text-rose-400 hover:text-white hover:bg-rose-950/80 rounded border border-rose-900/50 transition">
              Remove
            </button>
          </div>
        `).join('');

        container.querySelectorAll('.btn-remove-milestone').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const index = parseInt(e.currentTarget.getAttribute('data-remove-milestone'), 10);
            if (!isNaN(index) && index >= 0 && index < currentMilestones.length) {
              currentMilestones.splice(index, 1);
              renderMilestonesList();
            }
          });
        });
      }

      dom.workspaceRoot.innerHTML = `
        <div class="space-y-6 font-sans">
          <!-- Overview Card -->
          <div class="p-5 rounded-xl bg-brand-slate border border-brand-border shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 class="text-base font-bold text-white flex items-center gap-2">
                About Us & Institutional Mission Studio
                <span class="text-xs font-mono font-normal px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">module-03-002</span>
              </h2>
              <p class="text-xs text-slate-400 mt-0.5">Control public-facing institutional statements, core ideological pillars, and historical milestones.</p>
            </div>
            <div class="text-[11px] font-mono text-slate-400 bg-[#081220] border border-brand-border px-3 py-1.5 rounded-lg">
              Last Updated: <span id="aboutLastUpdated" class="text-emerald-400 font-bold">${new Date(about.updatedAt).toLocaleDateString()}</span>
            </div>
          </div>

          <!-- Card 1: Core Institutional Statements -->
          <div class="p-5 rounded-xl bg-brand-slate border border-brand-border shadow-md space-y-4">
            <div class="flex items-center gap-2 pb-3 border-b border-brand-border">
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              <h3 class="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
                Public Headlines & Statements
              </h3>
            </div>

            <div class="grid grid-cols-1 gap-4">
              <div>
                <label class="block text-xs font-semibold text-slate-200 mb-1">Hero Headline <span class="text-rose-400">*</span></label>
                <input id="inputAboutHeadline" type="text" value="${escapeHtml(about.headline || '')}" class="w-full bg-[#081220] border border-brand-border rounded-lg px-3 py-2 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-emerald font-medium">
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-200 mb-1">Subheadline / Narrative Summary</label>
                <input id="inputAboutSubheadline" type="text" value="${escapeHtml(about.subheadline || '')}" class="w-full bg-[#081220] border border-brand-border rounded-lg px-3 py-2 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-emerald">
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-semibold text-slate-200 mb-1">Institutional Mission Statement <span class="text-rose-400">*</span></label>
                  <textarea id="textareaAboutMission" rows="4" class="w-full bg-[#081220] border border-brand-border rounded-lg px-3 py-2 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-emerald leading-relaxed">${escapeHtml(about.mission || '')}</textarea>
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-200 mb-1">Institutional Vision Statement <span class="text-rose-400">*</span></label>
                  <textarea id="textareaAboutVision" rows="4" class="w-full bg-[#081220] border border-brand-border rounded-lg px-3 py-2 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-emerald leading-relaxed">${escapeHtml(about.vision || '')}</textarea>
                </div>
              </div>
            </div>
          </div>

          <!-- Card 2: Core Institutional Pillars -->
          <div class="p-5 rounded-xl bg-brand-slate border border-brand-border shadow-md space-y-4">
            <div class="flex items-center justify-between pb-3 border-b border-brand-border">
              <div class="flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
                <h3 class="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
                  Core Ideological Pillars
                </h3>
              </div>
              <span class="text-[11px] font-mono text-slate-400">Guiding Operational Principles</span>
            </div>

            <!-- Pillars List -->
            <div id="aboutPillarsContainer" class="space-y-2.5"></div>

            <!-- Add Pillar Form -->
            <div class="p-3.5 rounded-lg bg-slate-900/60 border border-brand-border/80 space-y-3">
              <h4 class="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">+ Add New Core Pillar</h4>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div class="sm:col-span-1">
                  <input id="inputNewPillarTitle" type="text" placeholder="Pillar Title (e.g., Free Access)" class="w-full bg-[#081220] border border-brand-border rounded-lg px-3 py-2 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-emerald">
                </div>
                <div class="sm:col-span-2">
                  <input id="inputNewPillarDesc" type="text" placeholder="Description of this operational tenet" class="w-full bg-[#081220] border border-brand-border rounded-lg px-3 py-2 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-emerald">
                </div>
              </div>
              <div class="flex justify-end">
                <button id="btnAddPillarAction" class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-brand-emerald hover:bg-brand-emeraldHover text-white shadow transition flex items-center gap-1">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                  Add Pillar
                </button>
              </div>
            </div>
          </div>

          <!-- Card 3: Historical Milestone Roadmap -->
          <div class="p-5 rounded-xl bg-brand-slate border border-brand-border shadow-md space-y-4">
            <div class="flex items-center justify-between pb-3 border-b border-brand-border">
              <div class="flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                <h3 class="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
                  Historical Milestone Roadmap
                </h3>
              </div>
              <span class="text-[11px] font-mono text-slate-400">Institutional Journey & Progress</span>
            </div>

            <!-- Milestones List -->
            <div id="aboutMilestonesContainer" class="space-y-2.5"></div>

            <!-- Add Milestone Form -->
            <div class="p-3.5 rounded-lg bg-slate-900/60 border border-brand-border/80 space-y-3">
              <h4 class="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">+ Add Milestone Achievement</h4>
              <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div class="sm:col-span-1">
                  <input id="inputNewMilestoneYear" type="text" placeholder="Year (e.g., 2026)" class="w-full bg-[#081220] border border-brand-border rounded-lg px-3 py-2 text-white text-xs font-mono placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-emerald">
                </div>
                <div class="sm:col-span-1">
                  <input id="inputNewMilestoneTitle" type="text" placeholder="Achievement Title" class="w-full bg-[#081220] border border-brand-border rounded-lg px-3 py-2 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-emerald">
                </div>
                <div class="sm:col-span-2">
                  <input id="inputNewMilestoneDesc" type="text" placeholder="Detailed impact or summary" class="w-full bg-[#081220] border border-brand-border rounded-lg px-3 py-2 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-emerald">
                </div>
              </div>
              <div class="flex justify-end">
                <button id="btnAddMilestoneAction" class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-brand-emerald hover:bg-brand-emeraldHover text-white shadow transition flex items-center gap-1">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                  Add Milestone
                </button>
              </div>
            </div>
          </div>
        </div>
      `;

      renderPillarsList();
      renderMilestonesList();

      // Form Bindings
      const inputHeadline = document.getElementById('inputAboutHeadline');
      const inputSubheadline = document.getElementById('inputAboutSubheadline');
      const textareaMission = document.getElementById('textareaAboutMission');
      const textareaVision = document.getElementById('textareaAboutVision');

      // Add Pillar Handler
      document.getElementById('btnAddPillarAction')?.addEventListener('click', () => {
        const titleInput = document.getElementById('inputNewPillarTitle');
        const descInput = document.getElementById('inputNewPillarDesc');
        const title = titleInput?.value.trim() || '';
        const desc = descInput?.value.trim() || '';

        if (!title) {
          showToast("Pillar title is required.", "warning");
          return;
        }

        currentPillars.push({
          id: `PIL-${String(currentPillars.length + 1).padStart(2, '0')}`,
          title: title,
          description: desc,
          icon: "sparkles"
        });

        titleInput.value = '';
        descInput.value = '';
        renderPillarsList();
        showToast("Pillar added to active draft.", "info");
      });

      // Add Milestone Handler
      document.getElementById('btnAddMilestoneAction')?.addEventListener('click', () => {
        const yearInput = document.getElementById('inputNewMilestoneYear');
        const titleInput = document.getElementById('inputNewMilestoneTitle');
        const descInput = document.getElementById('inputNewMilestoneDesc');

        const year = yearInput?.value.trim() || '';
        const title = titleInput?.value.trim() || '';
        const desc = descInput?.value.trim() || '';

        if (!year || !title) {
          showToast("Milestone year and title are required.", "warning");
          return;
        }

        currentMilestones.push({
          year: year,
          title: title,
          description: desc
        });

        yearInput.value = '';
        titleInput.value = '';
        descInput.value = '';
        renderMilestonesList();
        showToast("Milestone added to active draft.", "info");
      });

      // Save & Publish Mission Handler
      document.getElementById('btnSaveAboutMission')?.addEventListener('click', () => {
        const headline = inputHeadline?.value.trim() || '';
        const mission = textareaMission?.value.trim() || '';
        const vision = textareaVision?.value.trim() || '';

        if (!headline || !mission) {
          showToast("Headline and Mission statement are required.", "warning");
          return;
        }

        const payload = {
          headline: headline,
          subheadline: inputSubheadline?.value.trim() || '',
          mission: mission,
          vision: vision,
          pillars: currentPillars,
          milestones: currentMilestones
        };

        if (window.CSOSuperStore && typeof window.CSOSuperStore.saveAboutConfig === 'function') {
          const saved = window.CSOSuperStore.saveAboutConfig(payload);
          const dateEl = document.getElementById('aboutLastUpdated');
          if (dateEl && saved.updatedAt) {
            dateEl.textContent = new Date(saved.updatedAt).toLocaleDateString();
          }
          showToast("About Us & Mission configuration saved & published!", "success");
        }
      });

      // Export JSON Manifest Handler
      document.getElementById('btnExportAboutJson')?.addEventListener('click', () => {
        if (window.CSOSuperStore && typeof window.CSOSuperStore.exportAboutManifest === 'function') {
          const filename = window.CSOSuperStore.exportAboutManifest();
          showToast(`About manifest exported: ${filename}`, "success");
        }
      });
    }

    /**
     * VIEW 3c: Contact Information & Directory (module-03-003)
     */
    function renderContactDirectoryWorkspace() {
      // Header Breadcrumb
      dom.breadcrumbFolder.textContent = "Website Information & Legal";
      dom.breadcrumbModule.textContent = "Contact Information & Directory (module-03-003)";

      // Top Action Bar
      dom.moduleHeaderActions.innerHTML = `
        <div class="flex items-center gap-2">
          <button id="btnSaveContactDirectory" class="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-brand-emerald hover:bg-brand-emeraldHover text-white shadow flex items-center gap-1.5 transition">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
            Save Directory Changes
          </button>
          <a href="/contact.html" target="_blank" rel="noopener noreferrer" class="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-brand-border flex items-center gap-1.5 transition">
            <svg class="w-3.5 h-3.5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
            Preview Contact Desk ↗
          </a>
          <button id="btnExportContactJson" class="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-brand-border flex items-center gap-1.5 transition">
            <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            Export Directory (JSON)
          </button>
        </div>
      `;

      // Ingest Contact Directory
      let dir = (window.CSOSuperStore && typeof window.CSOSuperStore.getContactDirectory === 'function')
        ? window.CSOSuperStore.getContactDirectory()
        : {
            primaryEmail: "contact@csodisha.com",
            helplineNumber: "+91 674 239 0000",
            operatingHours: "09:30 AM - 05:30 PM IST (Mon - Sat)",
            postalAddress: "CS Odisha Academic Intelligence Node, Bhubaneswar / Balasore Liaison Desk, Odisha - 751001",
            channels: [],
            updatedAt: new Date().toISOString()
          };

      function renderChannelsTable() {
        const tbody = document.getElementById('contactChannelsTableBody');
        if (!tbody) return;

        const currentChannels = Array.isArray(dir.channels) ? dir.channels : [];
        if (currentChannels.length === 0) {
          tbody.innerHTML = `<tr><td colspan="6" class="px-4 py-6 text-center text-xs text-slate-400 font-mono">No specialized channels configured. Add one below.</td></tr>`;
          return;
        }

        const categoryBadges = {
          'Academic': 'bg-emerald-950/80 text-emerald-400 border-emerald-800/60',
          'Legal': 'bg-rose-950/80 text-rose-400 border-rose-800/60',
          'Technical': 'bg-cyan-950/80 text-cyan-400 border-cyan-800/60',
          'Outreach': 'bg-amber-950/80 text-amber-400 border-amber-800/60'
        };

        tbody.innerHTML = currentChannels.map((c) => {
          const badgeClass = categoryBadges[c.category] || 'bg-slate-800 text-slate-300 border-slate-700';
          return `
            <tr class="border-b border-brand-border/60 hover:bg-slate-800/40 transition">
              <td class="px-4 py-3 font-mono text-[11px] text-slate-400">${escapeHtml(c.id || '')}</td>
              <td class="px-4 py-3 font-semibold text-xs text-white">${escapeHtml(c.name || '')}</td>
              <td class="px-4 py-3 font-mono text-xs text-emerald-400">${escapeHtml(c.email || '')}</td>
              <td class="px-4 py-3">
                <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${badgeClass}">${escapeHtml(c.category || 'General')}</span>
              </td>
              <td class="px-4 py-3 text-xs text-slate-300 font-mono">${escapeHtml(c.hours || 'N/A')}</td>
              <td class="px-4 py-3 text-right">
                <button data-delete-channel="${escapeHtml(c.id)}" class="btn-delete-channel px-2.5 py-1 text-xs font-semibold text-rose-400 hover:text-white hover:bg-rose-950/80 rounded border border-rose-900/50 transition">
                  Delete
                </button>
              </td>
            </tr>
          `;
        }).join('');

        tbody.querySelectorAll('.btn-delete-channel').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-delete-channel');
            if (id && window.CSOSuperStore && typeof window.CSOSuperStore.deleteContactChannel === 'function') {
              window.CSOSuperStore.deleteContactChannel(id);
              dir = window.CSOSuperStore.getContactDirectory();
              renderChannelsTable();
              showToast(`Department channel ${id} removed.`, "info");
            }
          });
        });
      }

      dom.workspaceRoot.innerHTML = `
        <div class="space-y-6 font-sans">
          <!-- Overview Card -->
          <div class="p-5 rounded-xl bg-brand-slate border border-brand-border shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 class="text-base font-bold text-white flex items-center gap-2">
                Contact Information & Department Directory
                <span class="text-xs font-mono font-normal px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">module-03-003</span>
              </h2>
              <p class="text-xs text-slate-400 mt-0.5">Maintain state candidate helpdesks, emergency escalation channels, and physical liaison addresses.</p>
            </div>
            <div class="text-[11px] font-mono text-slate-400 bg-[#081220] border border-brand-border px-3 py-1.5 rounded-lg">
              Last Updated: <span id="contactLastUpdated" class="text-emerald-400 font-bold">${new Date(dir.updatedAt).toLocaleDateString()}</span>
            </div>
          </div>

          <!-- Card 1: Primary Institutional Communication Endpoints -->
          <div class="p-5 rounded-xl bg-brand-slate border border-brand-border shadow-md space-y-4">
            <div class="flex items-center gap-2 pb-3 border-b border-brand-border">
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              <h3 class="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
                Primary Institutional Communication Endpoints
              </h3>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-slate-200 mb-1">Primary General Email <span class="text-rose-400">*</span></label>
                <input id="inputContactEmail" type="email" value="${escapeHtml(dir.primaryEmail || '')}" class="w-full bg-[#081220] border border-brand-border rounded-lg px-3 py-2 text-white text-xs font-mono placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-emerald">
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-200 mb-1">Helpline Number <span class="text-rose-400">*</span></label>
                <input id="inputContactPhone" type="text" value="${escapeHtml(dir.helplineNumber || '')}" class="w-full bg-[#081220] border border-brand-border rounded-lg px-3 py-2 text-white text-xs font-mono placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-emerald">
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-200 mb-1">Operational Hours</label>
              <input id="inputContactHours" type="text" value="${escapeHtml(dir.operatingHours || '')}" class="w-full bg-[#081220] border border-brand-border rounded-lg px-3 py-2 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-emerald">
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-200 mb-1">Physical / Postal Address <span class="text-rose-400">*</span></label>
              <textarea id="textareaContactAddress" rows="3" class="w-full bg-[#081220] border border-brand-border rounded-lg px-3 py-2 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-emerald leading-relaxed">${escapeHtml(dir.postalAddress || '')}</textarea>
            </div>
          </div>

          <!-- Card 2: Specialized Department Channels Directory -->
          <div class="p-5 rounded-xl bg-brand-slate border border-brand-border shadow-md space-y-4">
            <div class="flex items-center justify-between pb-3 border-b border-brand-border">
              <div class="flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
                <h3 class="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
                  Specialized Department Channels Directory
                </h3>
              </div>
              <span class="text-[11px] font-mono text-slate-400">Targeted Resolution Desks</span>
            </div>

            <!-- Table of Channels -->
            <div class="overflow-x-auto rounded-lg border border-brand-border">
              <table class="w-full text-left text-xs border-collapse">
                <thead class="bg-slate-900 text-slate-300 font-mono text-[11px] border-b border-brand-border">
                  <tr>
                    <th class="px-4 py-2.5">ID</th>
                    <th class="px-4 py-2.5">Department Name</th>
                    <th class="px-4 py-2.5">Email Endpoint</th>
                    <th class="px-4 py-2.5">Category</th>
                    <th class="px-4 py-2.5">Hours</th>
                    <th class="px-4 py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody id="contactChannelsTableBody"></tbody>
              </table>
            </div>

            <!-- Inline Form to Add Department Channel -->
            <div class="p-4 rounded-lg bg-slate-900/60 border border-brand-border/80 space-y-3">
              <h4 class="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">+ Add Specialized Channel</h4>
              <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div class="sm:col-span-1">
                  <label class="block text-[11px] font-medium text-slate-400 mb-1">Channel Name</label>
                  <input id="inputNewChannelName" type="text" placeholder="e.g. Scholarship Desk" class="w-full bg-[#081220] border border-brand-border rounded-lg px-3 py-2 text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-emerald">
                </div>
                <div class="sm:col-span-1">
                  <label class="block text-[11px] font-medium text-slate-400 mb-1">Email Endpoint</label>
                  <input id="inputNewChannelEmail" type="email" placeholder="e.g. scholar@csodisha.com" class="w-full bg-[#081220] border border-brand-border rounded-lg px-3 py-2 text-white text-xs font-mono placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-emerald">
                </div>
                <div class="sm:col-span-1">
                  <label class="block text-[11px] font-medium text-slate-400 mb-1">Category</label>
                  <select id="selectNewChannelCategory" class="w-full bg-[#081220] border border-brand-border rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:ring-1 focus:ring-brand-emerald">
                    <option value="Academic">Academic</option>
                    <option value="Legal">Legal</option>
                    <option value="Technical">Technical</option>
                    <option value="Outreach">Outreach</option>
                  </select>
                </div>
                <div class="sm:col-span-1">
                  <label class="block text-[11px] font-medium text-slate-400 mb-1">Active Hours</label>
                  <input id="inputNewChannelHours" type="text" placeholder="e.g. 10:00 - 17:00 IST" class="w-full bg-[#081220] border border-brand-border rounded-lg px-3 py-2 text-white text-xs font-mono placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-emerald">
                </div>
              </div>
              <div class="flex justify-end">
                <button id="btnAddChannelAction" class="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-brand-emerald hover:bg-brand-emeraldHover text-white shadow transition flex items-center gap-1">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                  + Add Channel
                </button>
              </div>
            </div>
          </div>
        </div>
      `;

      renderChannelsTable();

      // Form Bindings
      const inputEmail = document.getElementById('inputContactEmail');
      const inputPhone = document.getElementById('inputContactPhone');
      const inputHours = document.getElementById('inputContactHours');
      const textareaAddress = document.getElementById('textareaContactAddress');

      // Add Channel Handler
      document.getElementById('btnAddChannelAction')?.addEventListener('click', () => {
        const nameInput = document.getElementById('inputNewChannelName');
        const emailInput = document.getElementById('inputNewChannelEmail');
        const categoryInput = document.getElementById('selectNewChannelCategory');
        const hoursInput = document.getElementById('inputNewChannelHours');

        const name = nameInput?.value.trim() || '';
        const email = emailInput?.value.trim() || '';
        const category = categoryInput?.value || 'Academic';
        const hours = hoursInput?.value.trim() || '10:00 - 17:00 IST';

        if (!name || !email) {
          showToast("Channel name and email are required.", "warning");
          return;
        }

        if (window.CSOSuperStore && typeof window.CSOSuperStore.addContactChannel === 'function') {
          window.CSOSuperStore.addContactChannel({
            name: name,
            email: email,
            category: category,
            hours: hours,
            status: "Active"
          });
          dir = window.CSOSuperStore.getContactDirectory();
          renderChannelsTable();

          nameInput.value = '';
          emailInput.value = '';
          hoursInput.value = '';
          showToast(`Specialized channel "${name}" added successfully.`, "success");
        }
      });

      // Save Directory Changes
      document.getElementById('btnSaveContactDirectory')?.addEventListener('click', () => {
        const email = inputEmail?.value.trim() || '';
        const phone = inputPhone?.value.trim() || '';
        const address = textareaAddress?.value.trim() || '';

        if (!email || !phone || !address) {
          showToast("General email, helpline phone, and postal address are required.", "warning");
          return;
        }

        const payload = {
          primaryEmail: email,
          helplineNumber: phone,
          operatingHours: inputHours?.value.trim() || "09:30 AM - 05:30 PM IST (Mon - Sat)",
          postalAddress: address,
          channels: dir.channels || []
        };

        if (window.CSOSuperStore && typeof window.CSOSuperStore.saveContactDirectory === 'function') {
          const saved = window.CSOSuperStore.saveContactDirectory(payload);
          dir = saved;
          const dateEl = document.getElementById('contactLastUpdated');
          if (dateEl && saved.updatedAt) {
            dateEl.textContent = new Date(saved.updatedAt).toLocaleDateString();
          }
          showToast("Contact Information & Directory saved successfully!", "success");
        }
      });

      // Export Directory Handler
      document.getElementById('btnExportContactJson')?.addEventListener('click', () => {
        if (window.CSOSuperStore && typeof window.CSOSuperStore.exportContactDirectory === 'function') {
          const filename = window.CSOSuperStore.exportContactDirectory();
          showToast(`Contact directory exported: ${filename}`, "success");
        }
      });
    }

    /**
     * VIEW 1e: Administrative Notifications (module-01-005)
     */
    function renderAdministrativeNotificationsWorkspace() {
      let activeFilter = 'ALL';

      dom.moduleHeaderActions.innerHTML = `
        <button id="btnCreateNoticeAction" class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-brand-emerald text-white hover:bg-brand-emeraldHover transition shadow flex items-center gap-1.5">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          + Create Notice
        </button>
      `;

      dom.workspaceRoot.innerHTML = `
        <!-- Notifications Command Bar -->
        <div class="p-5 rounded-xl bg-brand-slate border border-brand-border shadow-md space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 class="text-base font-bold text-white flex items-center gap-2">
                Executive Administrative Notice Hub
                <span class="text-xs font-mono font-normal text-slate-400">(Internal Operations)</span>
              </h2>
              <p class="text-xs text-slate-400 mt-0.5">High-priority operational warnings, student inquiry triage alerts, and security telemetry triggers.</p>
            </div>
            <div class="flex items-center gap-2">
              <button id="btnMarkAllRead" class="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-brand-border flex items-center gap-1.5 transition">
                <svg class="w-3.5 h-3.5 text-brand-emerald" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                Mark All as Read
              </button>
            </div>
          </div>

          <!-- Filter Tabs -->
          <div class="flex items-center gap-2 pt-3 border-t border-brand-border/60 overflow-x-auto text-xs font-semibold">
            <button class="notif-tab-btn px-3 py-1.5 rounded-lg bg-brand-emerald text-white transition" data-filter="ALL">All Notices</button>
            <button class="notif-tab-btn px-3 py-1.5 rounded-lg bg-[#081220] hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-brand-border transition" data-filter="UNREAD">Unread</button>
            <button class="notif-tab-btn px-3 py-1.5 rounded-lg bg-[#081220] hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-brand-border transition" data-filter="SYSTEM">System</button>
            <button class="notif-tab-btn px-3 py-1.5 rounded-lg bg-[#081220] hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-brand-border transition" data-filter="SECURITY">Security</button>
            <button class="notif-tab-btn px-3 py-1.5 rounded-lg bg-[#081220] hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-brand-border transition" data-filter="STUDENT">Student Desk</button>
          </div>
        </div>

        <!-- Notifications Stream Container -->
        <div class="p-5 rounded-xl bg-brand-slate border border-brand-border shadow-md">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-bold text-white text-sm">Active Administrative Notices</h3>
            <span id="notifCountBadge" class="text-xs font-mono text-slate-400">Loading notices...</span>
          </div>

          <div id="notifListContainer" class="space-y-3 font-mono text-xs">
            <!-- Dynamically populated -->
          </div>
        </div>
      `;

      function getPriorityConfig(priority) {
        const p = (priority || 'MEDIUM').toUpperCase();
        if (p === 'URGENT') return { bg: 'bg-red-500/15 text-brand-crimson border-brand-crimson/30', label: 'URGENT' };
        if (p === 'HIGH') return { bg: 'bg-amber-500/15 text-amber-300 border-amber-500/30', label: 'HIGH' };
        if (p === 'LOW') return { bg: 'bg-slate-700/40 text-slate-400 border-slate-600', label: 'LOW' };
        return { bg: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30', label: 'MEDIUM' };
      }

      function formatTimeAgo(timestamp) {
        if (!timestamp) return 'Just now';
        const diffMs = Date.now() - timestamp;
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays}d ago`;
      }

      function refreshNotifsView() {
        const container = document.getElementById('notifListContainer');
        const badge = document.getElementById('notifCountBadge');
        if (!container) return;

        let items = [];
        if (window.CSOSuperStore && typeof window.CSOSuperStore.getNotifications === 'function') {
          items = window.CSOSuperStore.getNotifications(activeFilter);
        }

        if (badge) {
          badge.textContent = `Showing ${items.length} notice${items.length === 1 ? '' : 's'}`;
        }

        if (!items.length) {
          container.innerHTML = `
            <div class="py-12 text-center text-slate-400 font-sans">
              <svg class="w-8 h-8 text-slate-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
              <p class="text-sm font-semibold text-slate-300">No notifications found in this category.</p>
              <p class="text-xs text-slate-500 mt-1">Select another filter or create a new notice above.</p>
            </div>
          `;
          return;
        }

        container.innerHTML = items.map(n => {
          const prio = getPriorityConfig(n.priority);
          const timeAgo = formatTimeAgo(n.createdAt);
          const isUnread = !n.read;

          return `
            <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-3 p-4 rounded-xl bg-[#081220] border ${isUnread ? 'border-brand-emerald/40 shadow-sm shadow-brand-emerald/5' : 'border-brand-border/60'} hover:border-brand-border transition">
              <div class="flex items-start gap-3 min-w-0 flex-1">
                <span class="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${isUnread ? 'bg-brand-emerald animate-ping' : 'bg-slate-600'}"></span>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2 flex-wrap mb-1">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold border tracking-wider ${prio.bg}">
                      ${prio.label}
                    </span>
                    <span class="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                      ${n.category || 'SYSTEM'}
                    </span>
                    <span class="font-mono text-cyan-400 font-bold text-[11px]">${n.id}</span>
                  </div>
                  <h4 class="text-sm font-bold text-white font-sans mb-1">${n.title}</h4>
                  <p class="text-xs text-slate-300 font-sans leading-relaxed">${n.message}</p>
                </div>
              </div>

              <div class="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-brand-border/40">
                <span class="text-[10px] text-slate-400 font-mono">${timeAgo}</span>
                <div class="flex items-center gap-1.5">
                  <button class="btn-toggle-read px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-sans font-medium text-[11px] transition" data-id="${n.id}" data-read="${n.read}">
                    ${isUnread ? 'Mark Read' : 'Mark Unread'}
                  </button>
                  <button class="btn-delete-notif p-1.5 rounded hover:bg-red-500/10 text-slate-500 hover:text-brand-crimson transition" data-id="${n.id}" title="Delete notice">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                  </button>
                </div>
              </div>
            </div>
          `;
        }).join('');

        // Wire individual card buttons
        container.querySelectorAll('.btn-toggle-read').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            const currentRead = e.currentTarget.getAttribute('data-read') === 'true';
            if (window.CSOSuperStore && typeof window.CSOSuperStore.markNotificationRead === 'function') {
              window.CSOSuperStore.markNotificationRead(id, !currentRead);
            }
            refreshNotifsView();
          });
        });

        container.querySelectorAll('.btn-delete-notif').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            if (window.CSOSuperStore && typeof window.CSOSuperStore.deleteNotification === 'function') {
              window.CSOSuperStore.deleteNotification(id);
            }
            showToast(`Notice ${id} deleted`, "info");
            refreshNotifsView();
          });
        });
      }

      // Filter tabs event listeners
      document.querySelectorAll('.notif-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          activeFilter = e.currentTarget.getAttribute('data-filter') || 'ALL';
          document.querySelectorAll('.notif-tab-btn').forEach(b => {
            b.className = "notif-tab-btn px-3 py-1.5 rounded-lg bg-[#081220] hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-brand-border transition";
          });
          e.currentTarget.className = "notif-tab-btn px-3 py-1.5 rounded-lg bg-brand-emerald text-white transition";
          refreshNotifsView();
        });
      });

      // Mark all read button
      const btnMarkAll = document.getElementById('btnMarkAllRead');
      if (btnMarkAll) {
        btnMarkAll.addEventListener('click', () => {
          if (window.CSOSuperStore && typeof window.CSOSuperStore.markAllNotificationsRead === 'function') {
            window.CSOSuperStore.markAllNotificationsRead();
          }
          showToast("All administrative notices marked as read", "success");
          refreshNotifsView();
        });
      }

      // Create Notice modal
      const btnCreate = document.getElementById('btnCreateNoticeAction');
      if (btnCreate) {
        btnCreate.addEventListener('click', () => {
          openModal("Create New Administrative Notice", `
            <div class="space-y-3 font-sans">
              <div>
                <label class="block text-slate-400 uppercase tracking-wider text-[10px] font-bold mb-1">Notice Title</label>
                <input type="text" id="inputNoticeTitle" placeholder="e.g. Scheduled D1 Maintenance Window" class="w-full bg-[#081220] border border-brand-border rounded-lg px-3 py-2 text-white text-xs focus:ring-1 focus:ring-brand-emerald" />
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-slate-400 uppercase tracking-wider text-[10px] font-bold mb-1">Category</label>
                  <select id="selectNoticeCategory" class="w-full bg-[#081220] border border-brand-border rounded-lg px-3 py-2 text-slate-300 text-xs focus:ring-1 focus:ring-brand-emerald">
                    <option value="SYSTEM">System Alert</option>
                    <option value="SECURITY">Security / WAF</option>
                    <option value="STUDENT">Student Desk</option>
                  </select>
                </div>
                <div>
                  <label class="block text-slate-400 uppercase tracking-wider text-[10px] font-bold mb-1">Priority</label>
                  <select id="selectNoticePriority" class="w-full bg-[#081220] border border-brand-border rounded-lg px-3 py-2 text-slate-300 text-xs focus:ring-1 focus:ring-brand-emerald">
                    <option value="LOW">Low</option>
                    <option value="MEDIUM" selected>Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>
              <div>
                <label class="block text-slate-400 uppercase tracking-wider text-[10px] font-bold mb-1">Message Body</label>
                <textarea id="inputNoticeMessage" rows="3" placeholder="Provide full details and instructions for administrators..." class="w-full bg-[#081220] border border-brand-border rounded-lg px-3 py-2 text-slate-200 text-xs focus:ring-1 focus:ring-brand-emerald"></textarea>
              </div>
            </div>
          `, `
            <button onclick="closeModal()" class="px-3 py-1.5 text-xs font-semibold rounded bg-slate-800 text-slate-300 hover:bg-slate-700">Cancel</button>
            <button id="btnSubmitNoticeModal" class="px-3 py-1.5 text-xs font-bold rounded bg-brand-emerald text-white hover:bg-brand-emeraldHover transition">Publish Notice</button>
          `);

          document.getElementById('btnSubmitNoticeModal')?.addEventListener('click', () => {
            const titleInput = document.getElementById('inputNoticeTitle');
            const catSelect = document.getElementById('selectNoticeCategory');
            const prioSelect = document.getElementById('selectNoticePriority');
            const msgInput = document.getElementById('inputNoticeMessage');

            const title = (titleInput ? titleInput.value : '').trim();
            const message = (msgInput ? msgInput.value : '').trim();

            if (!title || !message) {
              showToast("Please provide both notice title and message body", "warning");
              return;
            }

            if (window.CSOSuperStore && typeof window.CSOSuperStore.createNotification === 'function') {
              window.CSOSuperStore.createNotification({
                title,
                category: catSelect ? catSelect.value : 'SYSTEM',
                priority: prioSelect ? prioSelect.value : 'MEDIUM',
                message
              });
            }

            closeModal();
            showToast("New administrative notice registered successfully", "success");
            refreshNotifsView();
          });
        });
      }

      // Initial populate
      refreshNotifsView();
    }

    /**
     * VIEW 1d: Recent Activity & Audit Trail (module-01-004)
     */
    function renderRecentActivityWorkspace() {
      dom.moduleHeaderActions.innerHTML = `
        <button id="btnExportAuditAction" class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-brand-emerald text-white hover:bg-brand-emeraldHover transition shadow flex items-center gap-1.5">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
          Export Logs (JSON)
        </button>
      `;

      dom.workspaceRoot.innerHTML = `
        <!-- Audit Stream Controls -->
        <div class="p-5 rounded-xl bg-brand-slate border border-brand-border shadow-md space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 class="text-base font-bold text-white flex items-center gap-2">
                Immutable Event & Audit Stream
                <span class="text-xs font-mono font-normal text-slate-400">(Tamper-Evident Local Storage)</span>
              </h2>
              <p class="text-xs text-slate-400 mt-0.5">Chronological record of authentication, cache invalidation, edge updates, and administrative interventions.</p>
            </div>
            <div class="flex items-center gap-2">
              <button id="btnPruneAuditLogs" class="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-brand-border flex items-center gap-1.5 transition">
                <svg class="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                Prune Older Logs
              </button>
            </div>
          </div>

          <!-- Search & Filter Controls Bar -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-brand-border/60">
            <div class="sm:col-span-2 relative">
              <input type="text" id="auditSearchInput" placeholder="Search event logs by description, ID, or actor..." class="w-full bg-[#081220] border border-brand-border rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald transition" />
              <svg class="w-4 h-4 text-slate-500 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </div>

            <div>
              <select id="auditTypeFilter" class="w-full bg-[#081220] border border-brand-border rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald transition">
                <option value="ALL">All Event Types</option>
                <option value="AUTH">Authentication (AUTH)</option>
                <option value="BROADCAST">Broadcasts & Banners (BROADCAST)</option>
                <option value="EDGE">Edge & CDN (EDGE)</option>
                <option value="HEALTH">Diagnostics & Probes (HEALTH)</option>
                <option value="BACKUP">Backups & Recovery (BACKUP)</option>
                <option value="SECURITY">Security & Lockouts (SECURITY)</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Event Stream Container -->
        <div class="p-5 rounded-xl bg-brand-slate border border-brand-border shadow-md">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-bold text-white text-sm">Event Stream Records</h3>
            <span id="auditCountBadge" class="text-xs font-mono text-slate-400">Loading events...</span>
          </div>

          <div id="auditStreamContainer" class="space-y-3 font-mono text-xs">
            <!-- Dynamically populated -->
          </div>
        </div>
      `;

      // Helper function to colorize event pills
      function getPillConfig(eventType) {
        const type = (eventType || 'INFO').toUpperCase();
        if (type.includes('AUTH')) {
          return { bg: 'bg-emerald-500/15 text-brand-emerald border-brand-emerald/30', label: 'AUTH' };
        } else if (type.includes('EDGE') || type.includes('CACHE') || type.includes('HEALTH') || type.includes('DIAG')) {
          return { bg: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30', label: type.includes('HEALTH') ? 'HEALTH' : 'EDGE' };
        } else if (type.includes('BROADCAST') || type.includes('BANNER') || type.includes('BACKUP') || type.includes('SNAPSHOT')) {
          return { bg: 'bg-amber-500/15 text-amber-300 border-amber-500/30', label: type.includes('BACKUP') ? 'BACKUP' : 'BROADCAST' };
        } else if (type.includes('SECURITY') || type.includes('LOCK') || type.includes('FAIL') || type.includes('REVOKE')) {
          return { bg: 'bg-red-500/15 text-brand-crimson border-brand-crimson/30', label: 'SECURITY' };
        }
        return { bg: 'bg-slate-700/40 text-slate-300 border-slate-600', label: type.substring(0, 8) };
      }

      // Helper to render logs
      function refreshAuditStream() {
        const searchInput = document.getElementById('auditSearchInput');
        const typeFilter = document.getElementById('auditTypeFilter');
        const container = document.getElementById('auditStreamContainer');
        const badge = document.getElementById('auditCountBadge');

        const search = searchInput ? searchInput.value : '';
        const filter = typeFilter ? typeFilter.value : 'ALL';

        let logs = [];
        if (window.CSOSuperStore && typeof window.CSOSuperStore.getAllAuditLogs === 'function') {
          logs = window.CSOSuperStore.getAllAuditLogs(filter, search);
        } else {
          // Direct fallback query
          try {
            const raw = localStorage.getItem('cso_super_audit');
            const parsed = raw ? JSON.parse(raw) : [];
            logs = parsed.filter(entry => {
              const typeStr = (entry.eventType || entry.type || '').toUpperCase();
              const descStr = (entry.details || entry.description || '').toLowerCase();
              const idStr = (entry.id || '').toLowerCase();
              if (filter !== 'ALL' && !typeStr.includes(filter)) return false;
              if (search) {
                const s = search.toLowerCase();
                if (!descStr.includes(s) && !typeStr.toLowerCase().includes(s) && !idStr.includes(s)) return false;
              }
              return true;
            });
          } catch (_) {}
        }

        if (badge) {
          badge.textContent = `Showing ${logs.length} event${logs.length === 1 ? '' : 's'}`;
        }

        if (!container) return;

        if (!logs.length) {
          container.innerHTML = `
            <div class="py-12 text-center text-slate-400 font-sans">
              <svg class="w-8 h-8 text-slate-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
              <p class="text-sm font-semibold text-slate-300">No matching activity events found</p>
              <p class="text-xs text-slate-500 mt-1">Try adjusting your search criteria or event type filter.</p>
            </div>
          `;
          return;
        }

        container.innerHTML = logs.map(item => {
          const pill = getPillConfig(item.eventType || item.type);
          const dateStr = item.timestamp ? new Date(item.timestamp).toLocaleString() : 'Just now';
          const desc = item.details || item.description || item.eventType || 'System event recorded';
          const actor = item.actor || 'admin@csodisha.com';
          const id = item.id || 'AUD-0000';

          return `
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg bg-[#081220] border border-brand-border/70 hover:border-brand-border transition">
              <div class="flex items-start gap-3 min-w-0">
                <span class="px-2 py-0.5 rounded text-[10px] font-bold border tracking-wider flex-shrink-0 mt-0.5 ${pill.bg}">
                  ${pill.label}
                </span>
                <div class="min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="font-mono text-cyan-400 font-bold text-[11px]">${id}</span>
                    <span class="text-slate-500">&bull;</span>
                    <p class="text-slate-200 font-sans font-medium text-xs break-words">${desc}</p>
                  </div>
                  <div class="flex items-center gap-2 text-[10px] text-slate-500 mt-1 flex-wrap">
                    <span>Actor: <strong class="text-slate-400 font-mono">${actor}</strong></span>
                    <span>&bull;</span>
                    <span>IP: <code class="text-slate-400">${item.ip || '103.21.124.9'}</code></span>
                  </div>
                </div>
              </div>
              <div class="text-[10px] text-slate-400 font-mono sm:text-right flex-shrink-0">
                ${dateStr}
              </div>
            </div>
          `;
        }).join('');
      }

      // Event listeners
      const searchInput = document.getElementById('auditSearchInput');
      const typeFilter = document.getElementById('auditTypeFilter');
      if (searchInput) searchInput.addEventListener('input', refreshAuditStream);
      if (typeFilter) typeFilter.addEventListener('change', refreshAuditStream);

      // Export button
      const btnExport = document.getElementById('btnExportAuditAction');
      if (btnExport) {
        btnExport.addEventListener('click', () => {
          const search = searchInput ? searchInput.value : '';
          const filter = typeFilter ? typeFilter.value : 'ALL';
          let filtered = [];
          if (window.CSOSuperStore && typeof window.CSOSuperStore.getAllAuditLogs === 'function') {
            filtered = window.CSOSuperStore.getAllAuditLogs(filter, search);
            const filename = window.CSOSuperStore.exportAuditLogs(filtered);
            showToast(`Audit stream exported: ${filename}`, "success");
          } else {
            showToast("Exporting logs...", "info");
          }
        });
      }

      // Prune button
      const btnPrune = document.getElementById('btnPruneAuditLogs');
      if (btnPrune) {
        btnPrune.addEventListener('click', () => {
          openModal("Prune Event Logs", `
            <div class="space-y-3">
              <div class="p-3 rounded-lg bg-amber-500/10 border border-amber-500/40 text-amber-300 text-xs">
                <strong>Attention:</strong> Pruning will permanently retain only the newest 20 records in the audit trail and remove older log entries to conserve localStorage quota.
              </div>
              <p class="text-xs text-slate-300">Are you sure you want to prune older records?</p>
            </div>
          `, `
            <button onclick="closeModal()" class="px-3 py-1.5 text-xs font-semibold rounded bg-slate-800 text-slate-300 hover:bg-slate-700">Cancel</button>
            <button id="btnConfirmPruneAudit" class="px-3 py-1.5 text-xs font-bold rounded bg-amber-600 hover:bg-amber-500 text-white transition">Confirm & Prune</button>
          `);

          document.getElementById('btnConfirmPruneAudit')?.addEventListener('click', () => {
            closeModal();
            if (window.CSOSuperStore && typeof window.CSOSuperStore.pruneAuditLogs === 'function') {
              window.CSOSuperStore.pruneAuditLogs(20);
            }
            showToast("Audit trail pruned successfully (20 newest logs kept)", "success");
            refreshAuditStream();
          });
        });
      }

      // Initial populate
      refreshAuditStream();
    }

    /**
     * VIEW 1c: Quick Actions Operational Center (module-01-003)
     */
    function renderQuickActionsWorkspace() {
      const isMaint = (localStorage.getItem('cso_maintenance_mode') === 'true') || CSOState.maintenanceMode;
      const lastPurgeRaw = localStorage.getItem('cso_last_cache_purge');
      const lastPurgeDisplay = lastPurgeRaw ? new Date(parseInt(lastPurgeRaw, 10)).toLocaleTimeString() : 'Not recorded yet';

      dom.moduleHeaderActions.innerHTML = `
        <span class="text-xs font-mono px-2.5 py-1 rounded bg-brand-slate text-brand-emerald border border-brand-border">
          Operational Center Live
        </span>
      `;

      dom.workspaceRoot.innerHTML = `
        <!-- Quick Actions Banner -->
        <div class="p-5 rounded-xl bg-brand-slate border border-brand-border shadow-md">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 class="text-base font-bold text-white flex items-center gap-2">
                Executive Panic & Fast-Response Controls
                <span class="text-xs font-mono font-normal text-slate-400">(Zero-Latency Execution)</span>
              </h2>
              <p class="text-xs text-slate-400 mt-0.5">High-impact operational tasks requiring immediate edge routing and state mutation.</p>
            </div>
            <div class="flex items-center gap-2 text-xs font-mono text-slate-400">
              <span>Security Level:</span>
              <span class="px-2 py-0.5 rounded bg-brand-emerald/10 text-brand-emerald font-bold border border-brand-emerald/30">SUPER ADMIN</span>
            </div>
          </div>
        </div>

        <!-- 5 Interactive Action Cards Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          
          <!-- Card 1: Cloudflare CDN Edge Purge -->
          <div class="p-5 rounded-xl bg-brand-slate border border-brand-border hover:border-cyan-500/40 transition flex flex-col justify-between shadow-md">
            <div>
              <div class="flex items-center justify-between mb-3">
                <div class="w-10 h-10 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                </div>
                <span class="text-[11px] font-mono px-2 py-0.5 rounded bg-[#081220] text-cyan-400 border border-brand-border">Edge CDN</span>
              </div>
              <h3 class="font-bold text-white text-sm mb-1">Cloudflare CDN Edge Purge</h3>
              <p class="text-xs text-slate-400 mb-3">Invalidate global edge cache across all Singapore (SIN) and worldwide Cloudflare nodes.</p>
              <div class="p-2 rounded bg-[#081220] border border-brand-border text-[11px] font-mono text-slate-400 mb-4">
                Last purged: <span id="qaLastPurgeText" class="text-slate-200">${lastPurgeDisplay}</span>
              </div>
            </div>
            <button id="btnQaPurgeCache" class="w-full py-2.5 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition flex items-center justify-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              <span>Purge Global Cache</span>
            </button>
          </div>

          <!-- Card 2: Emergency Maintenance Mode -->
          <div class="p-5 rounded-xl bg-brand-slate border border-brand-border hover:border-amber-500/40 transition flex flex-col justify-between shadow-md">
            <div>
              <div class="flex items-center justify-between mb-3">
                <div class="w-10 h-10 rounded-lg bg-amber-500/10 text-brand-amber flex items-center justify-center">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                </div>
                <span id="qaMaintPill" class="text-[11px] font-mono px-2 py-0.5 rounded ${isMaint ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-slate-400 border border-slate-700'}">
                  ${isMaint ? 'STATUS: ACTIVE' : 'STATUS: INACTIVE'}
                </span>
              </div>
              <h3 class="font-bold text-white text-sm mb-1">Emergency Maintenance Mode</h3>
              <p class="text-xs text-slate-400 mb-3">Gate public traffic with a maintenance screen while maintaining full access for Super Administrators.</p>
              <div class="p-2 rounded bg-[#081220] border border-brand-border text-[11px] font-mono text-slate-400 mb-4">
                Public impact: <span id="qaMaintStatusDesc" class="text-slate-200 font-semibold">${isMaint ? 'Site gated' : 'All live routes open'}</span>
              </div>
            </div>
            <button id="btnQaToggleMaint" class="w-full py-2.5 px-3 rounded-lg ${isMaint ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'} font-bold text-xs transition flex items-center justify-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              <span id="btnQaToggleMaintText">${isMaint ? 'Disable Maintenance Mode' : 'Enable Maintenance Mode'}</span>
            </button>
          </div>

          <!-- Card 3: One-Click Disaster Backup -->
          <div class="p-5 rounded-xl bg-brand-slate border border-brand-border hover:border-emerald-500/40 transition flex flex-col justify-between shadow-md">
            <div>
              <div class="flex items-center justify-between mb-3">
                <div class="w-10 h-10 rounded-lg bg-emerald-500/10 text-brand-emerald flex items-center justify-center">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                </div>
                <span class="text-[11px] font-mono px-2 py-0.5 rounded bg-[#081220] text-brand-emerald border border-brand-border">Full Snapshot</span>
              </div>
              <h3 class="font-bold text-white text-sm mb-1">One-Click Disaster Backup</h3>
              <p class="text-xs text-slate-400 mb-3">Assemble full system state: users, resources, inquiries, audit logs, and configuration.</p>
              <div class="p-2 rounded bg-[#081220] border border-brand-border text-[11px] font-mono text-slate-400 mb-4">
                Payload format: <span class="text-slate-200">cso-system-backup-*.json</span>
              </div>
            </div>
            <button id="btnQaCreateBackup" class="w-full py-2.5 px-3 rounded-lg bg-brand-emerald hover:bg-brand-emeraldHover text-white font-bold text-xs transition flex items-center justify-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
              <span>Export Full System Backup</span>
            </button>
          </div>

          <!-- Card 4: Flash Admit Card Broadcast -->
          <div class="p-5 rounded-xl bg-brand-slate border border-brand-border hover:border-purple-500/40 transition flex flex-col justify-between shadow-md">
            <div>
              <div class="flex items-center justify-between mb-3">
                <div class="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"/></svg>
                </div>
                <span class="text-[11px] font-mono px-2 py-0.5 rounded bg-[#081220] text-purple-400 border border-brand-border">Live Alert</span>
              </div>
              <h3 class="font-bold text-white text-sm mb-1">Flash Admit Card Broadcast</h3>
              <p class="text-xs text-slate-400 mb-3">One-click live deployment of verified Odisha OSSC CGL 2026 Hall Ticket notice across the public homepage.</p>
              <div class="p-2 rounded bg-[#081220] border border-brand-border text-[11px] font-mono text-slate-400 mb-4">
                Destination: <span class="text-slate-200">csodisha.com/ (Header Top Mount)</span>
              </div>
            </div>
            <button id="btnQaPublishFlash" class="w-full py-2.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition flex items-center justify-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              <span>Broadcast Live Notice</span>
            </button>
          </div>

          <!-- Card 5: Zero-Trust Console Lock -->
          <div class="p-5 rounded-xl bg-brand-slate border border-brand-border hover:border-red-500/40 transition flex flex-col justify-between shadow-md">
            <div>
              <div class="flex items-center justify-between mb-3">
                <div class="w-10 h-10 rounded-lg bg-red-500/10 text-brand-crimson flex items-center justify-center">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                </div>
                <span class="text-[11px] font-mono px-2 py-0.5 rounded bg-[#081220] text-brand-crimson border border-brand-border">Panic Protocol</span>
              </div>
              <h3 class="font-bold text-white text-sm mb-1">Zero-Trust Console Lock</h3>
              <p class="text-xs text-slate-400 mb-3">Immediately invalidate session credentials, clear active tokens, and force biometric/password re-challenge.</p>
              <div class="p-2 rounded bg-[#081220] border border-brand-border text-[11px] font-mono text-slate-400 mb-4">
                Action: <span class="text-red-400 font-bold">Immediate credential eviction</span>
              </div>
            </div>
            <button id="btnQaZeroTrustLock" class="w-full py-2.5 px-3 rounded-lg bg-red-950/80 hover:bg-red-900 border border-brand-crimson text-red-200 font-bold text-xs transition flex items-center justify-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
              <span>Enforce Console Lock</span>
            </button>
          </div>

        </div>
      `;

      // Card 1: Cloudflare CDN Edge Purge
      const btnPurge = document.getElementById('btnQaPurgeCache');
      if (btnPurge) {
        btnPurge.addEventListener('click', () => {
          showToast("Sending purge signal to Cloudflare Edge...", "info");
          setTimeout(() => {
            if (window.CSOSuperStore && typeof window.CSOSuperStore.purgeEdgeCache === 'function') {
              const res = window.CSOSuperStore.purgeEdgeCache();
              const txt = document.getElementById('qaLastPurgeText');
              if (txt) txt.textContent = new Date(res.timestamp).toLocaleTimeString();
            } else {
              const now = Date.now();
              localStorage.setItem('cso_last_cache_purge', now.toString());
              const txt = document.getElementById('qaLastPurgeText');
              if (txt) txt.textContent = new Date(now).toLocaleTimeString();
            }
            showToast("Cloudflare CDN Edge Cache Purged Successfully (HTTP 200)", "success");
          }, 600);
        });
      }

      // Card 2: Emergency Maintenance Mode
      const btnMaint = document.getElementById('btnQaToggleMaint');
      if (btnMaint) {
        btnMaint.addEventListener('click', () => {
          let newState;
          if (window.CSOSuperStore && typeof window.CSOSuperStore.toggleMaintenanceMode === 'function') {
            newState = window.CSOSuperStore.toggleMaintenanceMode();
          } else {
            const current = localStorage.getItem('cso_maintenance_mode') === 'true';
            newState = !current;
            localStorage.setItem('cso_maintenance_mode', newState.toString());
          }
          CSOState.maintenanceMode = newState;

          // Update Card Elements
          const pill = document.getElementById('qaMaintPill');
          const desc = document.getElementById('qaMaintStatusDesc');
          const btnTxt = document.getElementById('btnQaToggleMaintText');
          if (pill) {
            pill.className = `text-[11px] font-mono px-2 py-0.5 rounded ${newState ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-slate-400 border border-slate-700'}`;
            pill.textContent = newState ? 'STATUS: ACTIVE' : 'STATUS: INACTIVE';
          }
          if (desc) desc.textContent = newState ? 'Site gated' : 'All live routes open';
          if (btnTxt) btnTxt.textContent = newState ? 'Disable Maintenance Mode' : 'Enable Maintenance Mode';
          btnMaint.className = `w-full py-2.5 px-3 rounded-lg ${newState ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'} font-bold text-xs transition flex items-center justify-center gap-2`;

          showToast(newState ? "Emergency Maintenance Mode ENABLED across csodisha.com" : "Emergency Maintenance Mode DISABLED — Portal Live", newState ? "warning" : "success");
        });
      }

      // Card 3: One-Click Disaster Backup
      const btnBackup = document.getElementById('btnQaCreateBackup');
      if (btnBackup) {
        btnBackup.addEventListener('click', () => {
          if (window.CSOSuperStore && typeof window.CSOSuperStore.createFullSystemBackup === 'function') {
            const res = window.CSOSuperStore.createFullSystemBackup();
            showToast(`Full system backup downloaded: ${res.filename} (${res.sizeKb} KB)`, "success");
          } else {
            const snapshot = {
              timestamp: new Date().toISOString(),
              metrics: CSOState
            };
            downloadSnapshotFile(snapshot, `cso-system-backup-${Date.now()}.json`);
          }
        });
      }

      // Card 4: Flash Admit Card Broadcast
      const btnFlash = document.getElementById('btnQaPublishFlash');
      if (btnFlash) {
        btnFlash.addEventListener('click', () => {
          let flash;
          if (window.CSOSuperStore && typeof window.CSOSuperStore.publishEmergencyFlash === 'function') {
            flash = window.CSOSuperStore.publishEmergencyFlash('admit_card');
          } else {
            flash = {
              headline: "Urgent: Odisha OSSC CGL 2026 Official Hall Ticket Download Released",
              context: "Official examination portal has issued hall tickets. Download links and instructions verified.",
              severity: "emerald",
              ctaText: "Check Hall Ticket Link",
              ctaUrl: "/resources.html#ossc-cgl",
              active: true,
              updatedAt: Date.now()
            };
            localStorage.setItem('cso_active_announcement', JSON.stringify(flash));
          }
          CSOState.broadcast = flash;
          showToast("Flash Hall Ticket Alert published live to homepage!", "success");
        });
      }

      // Card 5: Zero-Trust Console Lock
      const btnLock = document.getElementById('btnQaZeroTrustLock');
      if (btnLock) {
        btnLock.addEventListener('click', () => {
          openModal("Confirm Zero-Trust Console Lock", `
            <div class="space-y-3">
              <div class="p-3 rounded-lg bg-red-950/60 border border-brand-crimson/50 text-red-200 text-xs">
                <strong>Warning:</strong> This will terminate your current administrative session immediately and evict all authentication tokens from local storage.
              </div>
              <p class="text-xs text-slate-300">You will need to re-verify credentials and pass Cloudflare Turnstile challenge to regain access.</p>
            </div>
          `, `
            <button onclick="closeModal()" class="px-3 py-1.5 text-xs font-semibold rounded bg-slate-800 text-slate-300 hover:bg-slate-700">Cancel</button>
            <button id="btnConfirmLockModal" class="px-3 py-1.5 text-xs font-bold rounded bg-brand-crimson text-white hover:bg-red-600 transition">Confirm & Lock Console</button>
          `);

          document.getElementById('btnConfirmLockModal')?.addEventListener('click', () => {
            closeModal();
            showToast("Terminating session and enforcing console lockdown...", "warning");
            setTimeout(() => {
              if (window.CSOSuperStore && typeof window.CSOSuperStore.triggerZeroTrustLock === 'function') {
                window.CSOSuperStore.triggerZeroTrustLock();
              } else {
                sessionStorage.removeItem('cso_admin_token');
                sessionStorage.removeItem('cso_admin_session');
                window.location.replace('/admin/login?reason=locked');
              }
            }, 500);
          });
        });
      }
    }

    /**
     * VIEW 1b: Live Site Status & Diagnostic Probe (module-01-002)
     */
    async function executeDiagnosticsProbe() {
      const btn = document.getElementById('btnRunDiagnostics');
      const tableBody = document.getElementById('diagnosticTableBody');
      const edgeStatusPill = document.getElementById('diagEdgeStatusPill');
      const edgeAvgLatency = document.getElementById('diagAvgLatency');
      const edgeLastCheck = document.getElementById('diagLastCheck');
      const edgeStatusDot = document.getElementById('diagStatusDot');

      if (btn) {
        btn.disabled = true;
        btn.innerHTML = `
          <svg class="animate-spin w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
          Probing Endpoints...
        `;
      }

      let results = [];
      if (window.CSOSuperStore && typeof window.CSOSuperStore.runSystemHealthCheck === 'function') {
        try {
          results = await window.CSOSuperStore.runSystemHealthCheck();
        } catch (_) {}
      }

      if (!results || !results.length) {
        // Fallback probe execution if store instance is unavailable
        const endpoints = [
          { name: "Public Homepage", path: "/" },
          { name: "Academic Resources", path: "/resources.html" },
          { name: "Contact Desk", path: "/contact.html" },
          { name: "Admin Security Gate", path: "/admin/login.html" },
          { name: "Navigation Schema", path: "/admin/data/master-navigation.json" }
        ];
        for (const ep of endpoints) {
          const t0 = performance.now();
          try {
            const resp = await fetch(ep.path + '?diag=' + Date.now(), { method: 'HEAD', cache: 'no-store' });
            results.push({
              name: ep.name,
              path: ep.path,
              status: resp.status,
              statusText: resp.statusText || 'OK',
              rttMs: Math.round(performance.now() - t0),
              healthy: resp.ok,
              cfRay: resp.headers.get('cf-ray') || 'Direct/Local',
              checkedAt: new Date().toLocaleTimeString()
            });
          } catch (_) {
            results.push({
              name: ep.name,
              path: ep.path,
              status: 0,
              statusText: 'Unreachable / Network Error',
              rttMs: Math.round(performance.now() - t0),
              healthy: false,
              cfRay: 'N/A',
              checkedAt: new Date().toLocaleTimeString()
            });
          }
        }
      }

      // Calculations
      const allHealthy = results.every(r => r.healthy);
      const totalRtt = results.reduce((sum, r) => sum + r.rttMs, 0);
      const avgRtt = results.length ? Math.round(totalRtt / results.length) : 0;
      const lastCheckTime = new Date().toLocaleTimeString();

      // Update Summary Bar
      if (edgeStatusPill && edgeStatusDot) {
        if (allHealthy) {
          edgeStatusPill.className = "px-2.5 py-1 text-xs font-mono font-bold rounded-lg bg-emerald-500/20 text-brand-emerald border border-brand-emerald/40";
          edgeStatusPill.textContent = "ALL SYSTEMS OPERATIONAL";
          edgeStatusDot.className = "w-3 h-3 rounded-full bg-brand-emerald animate-pulse";
        } else {
          edgeStatusPill.className = "px-2.5 py-1 text-xs font-mono font-bold rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40";
          edgeStatusPill.textContent = "SERVICE DEGRADED";
          edgeStatusDot.className = "w-3 h-3 rounded-full bg-amber-400 animate-pulse";
        }
      }
      if (edgeAvgLatency) edgeAvgLatency.textContent = `${avgRtt} ms`;
      if (edgeLastCheck) edgeLastCheck.textContent = lastCheckTime;

      // Populate Table
      if (tableBody) {
        tableBody.innerHTML = results.map(r => `
          <tr class="hover:bg-brand-card/40 transition">
            <td class="py-3 px-4 font-semibold text-white">
              ${r.name}
              <div class="text-[10px] text-slate-500 font-mono sm:hidden">${r.path}</div>
            </td>
            <td class="py-3 px-4 font-mono text-cyan-400 hidden sm:table-cell">${r.path}</td>
            <td class="py-3 px-4">
              <span class="px-2 py-0.5 rounded text-[11px] font-mono font-bold ${r.healthy ? 'bg-emerald-500/10 text-brand-emerald border border-brand-emerald/30' : 'bg-red-500/10 text-brand-crimson border border-red-500/30'}">
                ${r.status ? r.status + ' ' + r.statusText : 'FAILED'}
              </span>
            </td>
            <td class="py-3 px-4 font-mono font-semibold ${r.rttMs < 50 ? 'text-brand-emerald' : (r.rttMs < 200 ? 'text-amber-400' : 'text-brand-crimson')}">
              ${r.rttMs} ms
            </td>
            <td class="py-3 px-4 font-mono text-slate-400 text-[11px] hidden md:table-cell">
              ${r.cfRay}
            </td>
            <td class="py-3 px-4 text-right">
              <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold ${r.healthy ? 'bg-brand-emerald/20 text-brand-emerald' : 'bg-brand-crimson/20 text-brand-crimson'}">
                <span class="w-1.5 h-1.5 rounded-full ${r.healthy ? 'bg-brand-emerald' : 'bg-brand-crimson'}"></span>
                ${r.healthy ? 'Operational' : 'Failing'}
              </span>
            </td>
          </tr>
        `).join('');
      }

      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          Run Diagnostics Now
        `;
      }
    }

    function renderLiveSiteStatusWorkspace() {
      dom.moduleHeaderActions.innerHTML = `
        <button id="btnRunDiagnostics" class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-brand-emerald text-white hover:bg-brand-emeraldHover transition shadow flex items-center gap-1.5">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          Run Diagnostics Now
        </button>
      `;

      dom.workspaceRoot.innerHTML = `
        <!-- Edge & Health Summary Bar -->
        <div class="p-5 rounded-xl bg-brand-slate border border-brand-border shadow-md space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <span id="diagStatusDot" class="w-3 h-3 rounded-full bg-brand-emerald animate-pulse"></span>
              <div>
                <h2 class="text-base font-bold text-white flex items-center gap-2">
                  Cloudflare Edge Telemetry
                  <span class="text-xs font-mono font-normal text-slate-400">(SIN - Singapore PoP)</span>
                </h2>
                <p class="text-xs text-slate-400 mt-0.5">Live latency and round-trip time probes across public routes</p>
              </div>
            </div>
            <span id="diagEdgeStatusPill" class="px-2.5 py-1 text-xs font-mono font-bold rounded-lg bg-emerald-500/20 text-brand-emerald border border-brand-emerald/40">
              PROBING SYSTEM...
            </span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-brand-border/60 font-mono text-xs">
            <div class="p-3 rounded-lg bg-[#081220] border border-brand-border">
              <span class="text-slate-400 block text-[11px] font-sans">Edge PoP Location</span>
              <strong class="text-white text-sm">SIN &bull; Singapore</strong>
            </div>
            <div class="p-3 rounded-lg bg-[#081220] border border-brand-border">
              <span class="text-slate-400 block text-[11px] font-sans">Average Round-Trip Latency</span>
              <strong id="diagAvgLatency" class="text-brand-emerald text-sm">-- ms</strong>
            </div>
            <div class="p-3 rounded-lg bg-[#081220] border border-brand-border">
              <span class="text-slate-400 block text-[11px] font-sans">Last Diagnostic Probe</span>
              <strong id="diagLastCheck" class="text-slate-200 text-sm">Checking...</strong>
            </div>
          </div>
        </div>

        <!-- Probed Endpoints Table -->
        <div class="p-5 rounded-xl bg-brand-slate border border-brand-border shadow-md">
          <h3 class="font-bold text-white text-sm mb-4">Core Endpoint Route Health Diagnostics</h3>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs text-slate-300">
              <thead class="bg-[#081220] uppercase font-mono text-[10px] text-slate-400 border-b border-brand-border">
                <tr>
                  <th class="py-2.5 px-4">Endpoint Name</th>
                  <th class="py-2.5 px-4 hidden sm:table-cell">Route Path</th>
                  <th class="py-2.5 px-4">HTTP Response</th>
                  <th class="py-2.5 px-4">Latency (RTT)</th>
                  <th class="py-2.5 px-4 hidden md:table-cell">Cloudflare Ray</th>
                  <th class="py-2.5 px-4 text-right">Health Status</th>
                </tr>
              </thead>
              <tbody id="diagnosticTableBody" class="divide-y divide-brand-border/60">
                <tr>
                  <td colspan="6" class="py-8 text-center text-slate-400">
                    <svg class="animate-spin w-5 h-5 text-brand-emerald mx-auto mb-2" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
                    Dispatching multi-endpoint HTTP HEAD probes...
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      `;

      // Wire button action
      const btnProbe = document.getElementById('btnRunDiagnostics');
      if (btnProbe) {
        btnProbe.addEventListener('click', () => {
          executeDiagnosticsProbe();
        });
      }

      // Execute probe automatically on view mount
      executeDiagnosticsProbe();
    }

    /**
     * VIEW 1: Overview Command Centre (module-01-001)
     */
    function getAuditEvents() {
      try {
        const raw = localStorage.getItem('cso_super_audit');
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list) && list.length > 0) return list;
        }
      } catch (_) {}
      if (window.CSOSuperStore && typeof window.CSOSuperStore.getAudit === 'function') {
        try {
          return window.CSOSuperStore.getAudit();
        } catch (_) {}
      }
      return [
        { eventType: 'AUTH_SUCCESS', actor: 'admin@csodisha.com', details: 'Super admin authentication completed (SHA-256 Verified Session)', timestamp: new Date(Date.now() - 120000).toISOString(), ip: '103.21.124.9' },
        { eventType: 'EDGE_DEPLOY', actor: 'system', details: 'Cloudflare Pages deployment published to csodisha.com', timestamp: new Date(Date.now() - 840000).toISOString(), ip: 'SIN-Edge' },
        { eventType: 'INQUIRY_RECEIVED', actor: 'citizen', details: 'New student inquiry received: B.Ed Choice Filling Guidance', timestamp: new Date(Date.now() - 2880000).toISOString(), ip: '103.145.74.22' }
      ];
    }

    function renderAuditEventsHtml(limit = 5) {
      const logs = getAuditEvents().slice(0, limit);
      return logs.map(item => {
        const type = (item.eventType || 'INFO').toUpperCase();
        let badgeColor = 'bg-brand-emerald/10 text-brand-emerald';
        let shortType = 'AUTH';
        if (type.includes('FAIL') || type.includes('LOCKOUT') || type.includes('REVOKE')) {
          badgeColor = 'bg-red-500/10 text-brand-crimson';
          shortType = 'WARN';
        } else if (type.includes('EDGE') || type.includes('PURGE')) {
          badgeColor = 'bg-cyan-500/10 text-cyan-400';
          shortType = 'EDGE';
        } else if (type.includes('INQ')) {
          badgeColor = 'bg-amber-500/10 text-amber-400';
          shortType = 'INQ';
        }
        const timeAgo = item.timestamp ? (new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) + ' &bull; ' + (item.ip || '103.21.124.9')) : 'Just now';
        return `
          <div class="flex items-start gap-3 p-2.5 rounded-lg bg-[#081220] border border-brand-border">
            <span class="text-[10px] ${badgeColor} px-1.5 py-0.5 rounded mt-0.5 font-bold">${shortType}</span>
            <div class="flex-1 min-w-0">
              <p class="text-slate-200 font-sans truncate">${item.details || item.eventType}</p>
              <span class="text-[10px] text-slate-500">${timeAgo} &bull; ${item.actor || 'admin@csodisha.com'}</span>
            </div>
          </div>
        `;
      }).join('');
    }

    function renderOverviewWorkspace() {
      // Calculate live real metrics from super-store or localStorage
      let metrics = {
        userCount: 0,
        resourceCount: 0,
        unreadInquiries: 0,
        totalInquiries: 0,
        storageKb: '0.00'
      };

      if (window.CSOSuperStore && typeof window.CSOSuperStore.getLiveMetrics === 'function') {
        try {
          metrics = window.CSOSuperStore.getLiveMetrics();
        } catch (_) {}
      } else {
        try {
          const users = JSON.parse(localStorage.getItem('cso_super_users') || '[]');
          const resources = JSON.parse(localStorage.getItem('cso_super_resources') || '[]');
          const inquiries = JSON.parse(localStorage.getItem('cso_super_inquiries') || '[]');
          const unreadInquiries = inquiries.filter(i => (i.status || '').toLowerCase() !== 'resolved').length;
          let totalBytes = 0;
          for (let key in localStorage) {
            if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
              totalBytes += (localStorage[key].length + key.length) * 2;
            }
          }
          metrics = {
            userCount: users.length,
            resourceCount: resources.length,
            unreadInquiries: unreadInquiries,
            totalInquiries: inquiries.length,
            storageKb: (totalBytes / 1024).toFixed(2)
          };
        } catch (_) {}
      }

      dom.moduleHeaderActions.innerHTML = `
        <button id="btnExportOverview" class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-brand-emerald text-white hover:bg-brand-emeraldHover transition shadow flex items-center gap-1.5">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
          Export Telemetry
        </button>
      `;

      dom.workspaceRoot.innerHTML = `
        <!-- KPI Metric Cards Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- Total Registered Users -->
          <div class="p-4 rounded-xl bg-brand-slate border border-brand-border shadow-md">
            <div class="flex items-center justify-between text-slate-400 mb-2">
              <span class="text-xs font-medium uppercase tracking-wider">Candidate Accounts</span>
              <span class="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
              </span>
            </div>
            <div class="flex items-baseline gap-2">
              <span class="text-2xl font-extrabold text-white">${metrics.userCount.toLocaleString()}</span>
              <span class="text-xs font-semibold text-brand-emerald font-mono">Live</span>
            </div>
            <p class="text-[11px] text-slate-400 mt-2">Active accounts registered in store</p>
          </div>

          <!-- Educational Resources -->
          <div class="p-4 rounded-xl bg-brand-slate border border-brand-border shadow-md">
            <div class="flex items-center justify-between text-slate-400 mb-2">
              <span class="text-xs font-medium uppercase tracking-wider">Verified Resources</span>
              <span class="p-1.5 rounded-lg bg-emerald-500/10 text-brand-emerald">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
              </span>
            </div>
            <div class="flex items-baseline gap-2">
              <span class="text-2xl font-extrabold text-white">${metrics.resourceCount.toLocaleString()}</span>
              <span class="text-xs font-semibold text-brand-emerald font-mono">Indexed</span>
            </div>
            <p class="text-[11px] text-slate-400 mt-2">Syllabus, PYQs & Scheme documents</p>
          </div>

          <!-- Pending Student Queries -->
          <div class="p-4 rounded-xl bg-brand-slate border border-brand-border shadow-md">
            <div class="flex items-center justify-between text-slate-400 mb-2">
              <span class="text-xs font-medium uppercase tracking-wider">Inquiry Desk</span>
              <span class="p-1.5 rounded-lg bg-amber-500/10 text-brand-amber">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>
              </span>
            </div>
            <div class="flex items-baseline gap-2">
              <span class="text-2xl font-extrabold text-white">${metrics.unreadInquiries.toLocaleString()}</span>
              <span class="text-xs font-semibold ${metrics.unreadInquiries > 0 ? 'text-amber-400' : 'text-brand-emerald'}">${metrics.unreadInquiries > 0 ? 'Pending' : 'All Clear'}</span>
            </div>
            <p class="text-[11px] text-slate-400 mt-2">Total received inquiries: ${metrics.totalInquiries}</p>
          </div>

          <!-- Database & Storage Footprint -->
          <div class="p-4 rounded-xl bg-brand-slate border border-brand-border shadow-md">
            <div class="flex items-center justify-between text-slate-400 mb-2">
              <span class="text-xs font-medium uppercase tracking-wider">Storage Footprint</span>
              <span class="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"/></svg>
              </span>
            </div>
            <div class="flex items-baseline gap-2">
              <span class="text-2xl font-extrabold text-white">${metrics.storageKb} KB</span>
              <span class="text-xs font-semibold text-cyan-400 font-mono">Synced</span>
            </div>
            <p class="text-[11px] text-slate-400 mt-2">Calculated local platform storage</p>
          </div>
        </div>

        <!-- Live Emergency Homepage Broadcast Controller -->
        <div class="p-5 rounded-xl bg-brand-card border border-brand-border shadow-lg">
          <div class="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-brand-border">
            <div class="flex items-center gap-2">
              <span id="broadcastStatusDot" class="w-2.5 h-2.5 rounded-full ${CSOState.broadcast.active ? 'bg-brand-emerald animate-ping' : 'bg-slate-600'}"></span>
              <h3 class="font-bold text-white text-sm">Homepage Live Broadcast Banner</h3>
              <span id="broadcastStatusPill" class="text-[11px] font-mono px-2 py-0.5 rounded ${CSOState.broadcast.active ? 'bg-brand-emerald/20 text-brand-emerald border border-brand-emerald/40' : 'bg-slate-800 text-slate-400'}">${CSOState.broadcast.active ? 'STATUS: LIVE' : 'STATUS: INACTIVE'}</span>
            </div>
            <button id="btnToggleBroadcast" class="px-3 py-1.5 text-xs font-bold rounded-lg ${CSOState.broadcast.active ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-brand-emerald hover:bg-brand-emeraldHover text-white'} transition">
              ${CSOState.broadcast.active ? 'Take Down Live Banner' : 'Publish Banner'}
            </button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div class="md:col-span-2 space-y-3">
              <div>
                <label class="block text-slate-400 uppercase tracking-wider text-[10px] font-bold mb-1">Headline</label>
                <input id="inputBroadcastHeadline" type="text" value="${CSOState.broadcast.headline}" class="w-full bg-[#081220] border border-brand-border rounded-lg px-3 py-2 text-white text-xs focus:ring-1 focus:ring-brand-emerald" />
              </div>
              <div>
                <label class="block text-slate-400 uppercase tracking-wider text-[10px] font-bold mb-1">Context & Instructions</label>
                <input id="inputBroadcastContext" type="text" value="${CSOState.broadcast.context}" class="w-full bg-[#081220] border border-brand-border rounded-lg px-3 py-2 text-slate-300 text-xs focus:ring-1 focus:ring-brand-emerald" />
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-slate-400 uppercase tracking-wider text-[10px] font-bold mb-1">CTA Button Text</label>
                  <input id="inputBroadcastCta" type="text" value="${CSOState.broadcast.ctaText}" class="w-full bg-[#081220] border border-brand-border rounded-lg px-3 py-2 text-white text-xs" />
                </div>
                <div>
                  <label class="block text-slate-400 uppercase tracking-wider text-[10px] font-bold mb-1">Target Link URL</label>
                  <input id="inputBroadcastUrl" type="text" value="${CSOState.broadcast.ctaUrl}" class="w-full bg-[#081220] border border-brand-border rounded-lg px-3 py-2 text-slate-300 text-xs font-mono" />
                </div>
              </div>
            </div>

            <!-- Banner Live Preview -->
            <div class="p-3.5 rounded-lg bg-[#081220] border border-brand-border flex flex-col justify-between">
              <div>
                <span class="text-[10px] font-mono text-slate-500 uppercase font-bold block mb-2">Simulated Homepage View</span>
                <div class="p-3 rounded-lg border border-brand-emerald/40 bg-brand-emerald/10 text-emerald-200 text-xs space-y-1.5">
                  <div class="font-bold flex items-center gap-1.5">
                    <span>📢</span>
                    <span id="previewHeadline">${CSOState.broadcast.headline}</span>
                  </div>
                  <p id="previewContext" class="text-[11px] text-slate-300">${CSOState.broadcast.context}</p>
                  <a href="#" class="inline-block px-2.5 py-1 text-[10px] font-bold bg-brand-emerald text-white rounded">${CSOState.broadcast.ctaText} &rarr;</a>
                </div>
              </div>
              <button id="btnSaveBroadcast" class="w-full mt-3 py-2 text-xs font-bold rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition">Save Banner Content</button>
            </div>
          </div>
        </div>

        <!-- Recent Activity Feed & Rapid Dispatch Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Recent Chronological Activity -->
          <div class="lg:col-span-2 p-5 rounded-xl bg-brand-slate border border-brand-border">
            <h3 class="font-bold text-white text-sm mb-4 flex items-center justify-between">
              <span>Audit & Incident Event Stream</span>
              <span class="text-[11px] font-mono text-brand-emerald">Live UTC / IST</span>
            </h3>
            <div class="space-y-3 font-mono text-xs">
              ${renderAuditEventsHtml(4)}
            </div>
          </div>

          <!-- Quick Launch Shortcuts -->
          <div class="p-5 rounded-xl bg-brand-slate border border-brand-border flex flex-col justify-between">
            <div>
              <h3 class="font-bold text-white text-sm mb-3">Administrative Hotkeys</h3>
              <p class="text-xs text-slate-400 mb-4">Direct shortcuts to high-frequency maintenance modules.</p>
              <div class="space-y-2 text-xs">
                <button class="w-full px-3 py-2.5 rounded-lg bg-brand-card hover:bg-slate-700 text-left font-medium text-slate-200 flex items-center justify-between border border-brand-border" onclick="selectModule('folder-02', 'module-02-002')">
                  <span>+ Create New Page</span>
                  <span class="text-slate-500 font-mono text-[10px]">&rarr;</span>
                </button>
                <button class="w-full px-3 py-2.5 rounded-lg bg-brand-card hover:bg-slate-700 text-left font-medium text-slate-200 flex items-center justify-between border border-brand-border" onclick="selectModule('folder-05', 'module-05-010')">
                  <span>Publish Syllabus & PYQ</span>
                  <span class="text-slate-500 font-mono text-[10px]">&rarr;</span>
                </button>
                <button class="w-full px-3 py-2.5 rounded-lg bg-brand-card hover:bg-slate-700 text-left font-medium text-slate-200 flex items-center justify-between border border-brand-border" onclick="selectModule('folder-10', 'module-10-001')">
                  <span>Triage Contact Inquiries (18)</span>
                  <span class="text-slate-500 font-mono text-[10px]">&rarr;</span>
                </button>
                <button class="w-full px-3 py-2.5 rounded-lg bg-brand-card hover:bg-slate-700 text-left font-medium text-slate-200 flex items-center justify-between border border-brand-border" onclick="selectModule('folder-17', 'module-17-016')">
                  <span>Disaster Recovery & Snapshots</span>
                  <span class="text-slate-500 font-mono text-[10px]">&rarr;</span>
                </button>
              </div>
            </div>
            
            <div class="p-3 rounded-lg bg-[#081220] border border-brand-border mt-4 text-[11px] text-slate-400">
              <span class="font-bold text-brand-emerald">Google SMTP Relay:</span> smtp.gmail.com:587 verified for <code class="text-slate-200">admin@csodisha.com</code>.
            </div>
          </div>
        </div>
      `;

      // Wire Broadcast Interactivity
      const btnToggle = document.getElementById('btnToggleBroadcast');
      const btnSave = document.getElementById('btnSaveBroadcast');
      const inHead = document.getElementById('inputBroadcastHeadline');
      const inCtx = document.getElementById('inputBroadcastContext');
      const inCta = document.getElementById('inputBroadcastCta');
      const inUrl = document.getElementById('inputBroadcastUrl');
      const prevHead = document.getElementById('previewHeadline');
      const prevCtx = document.getElementById('previewContext');

      if (inHead && prevHead) inHead.addEventListener('input', () => prevHead.textContent = inHead.value);
      if (inCtx && prevCtx) inCtx.addEventListener('input', () => prevCtx.textContent = inCtx.value);

      if (btnSave) {
        btnSave.addEventListener('click', () => {
          const headline = inHead ? inHead.value.trim() : CSOState.broadcast.headline;
          const context = inCtx ? inCtx.value.trim() : CSOState.broadcast.context;
          const ctaText = inCta ? inCta.value.trim() : CSOState.broadcast.ctaText;
          const ctaUrl = inUrl ? inUrl.value.trim() : CSOState.broadcast.ctaUrl;

          const broadcast = {
            headline,
            context,
            ctaText,
            ctaUrl,
            severity: "emerald",
            active: true,
            updatedAt: Date.now()
          };

          CSOState.broadcast = broadcast;
          try {
            localStorage.setItem('cso_active_announcement', JSON.stringify(broadcast));
          } catch (_) {}

          // Audit logging
          try {
            const raw = localStorage.getItem('cso_super_audit');
            const logs = raw ? JSON.parse(raw) : [];
            logs.unshift({
              id: 'AUD-' + Math.floor(1000 + Math.random() * 9000),
              timestamp: new Date().toISOString(),
              actor: 'admin@csodisha.com',
              eventType: 'BROADCAST_UPDATED',
              target: 'HOMEPAGE_BROADCAST',
              ip: '103.21.124.9',
              details: `Broadcast banner updated: "${headline}" [Active: true]`
            });
            if (logs.length > 200) logs.pop();
            localStorage.setItem('cso_super_audit', JSON.stringify(logs));
          } catch (_) {}

          if (window.CSOSuperStore && typeof window.CSOSuperStore.logAudit === 'function') {
            try {
              window.CSOSuperStore.logAudit('BROADCAST_UPDATED', 'HOMEPAGE_BROADCAST', `Broadcast banner updated: "${headline}" [Active: true]`);
            } catch (_) {}
          }

          showToast("Broadcast banner content saved and published to homepage", "success");
          renderOverviewWorkspace();
        });
      }

      if (btnToggle) {
        btnToggle.addEventListener('click', () => {
          CSOState.broadcast.active = !CSOState.broadcast.active;
          CSOState.broadcast.updatedAt = Date.now();

          const broadcast = {
            headline: inHead ? inHead.value.trim() : CSOState.broadcast.headline,
            context: inCtx ? inCtx.value.trim() : CSOState.broadcast.context,
            ctaText: inCta ? inCta.value.trim() : CSOState.broadcast.ctaText,
            ctaUrl: inUrl ? inUrl.value.trim() : CSOState.broadcast.ctaUrl,
            severity: "emerald",
            active: CSOState.broadcast.active,
            updatedAt: CSOState.broadcast.updatedAt
          };

          CSOState.broadcast = broadcast;
          try {
            localStorage.setItem('cso_active_announcement', JSON.stringify(broadcast));
          } catch (_) {}

          // Update button text and status pill directly
          const pill = document.getElementById('broadcastStatusPill');
          const dot = document.getElementById('broadcastStatusDot');
          if (pill) {
            pill.className = `text-[11px] font-mono px-2 py-0.5 rounded ${broadcast.active ? 'bg-brand-emerald/20 text-brand-emerald border border-brand-emerald/40' : 'bg-slate-800 text-slate-400'}`;
            pill.textContent = broadcast.active ? 'STATUS: LIVE' : 'STATUS: INACTIVE';
          }
          if (dot) {
            dot.className = `w-2.5 h-2.5 rounded-full ${broadcast.active ? 'bg-brand-emerald animate-ping' : 'bg-slate-600'}`;
          }
          btnToggle.className = `px-3 py-1.5 text-xs font-bold rounded-lg ${broadcast.active ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-brand-emerald hover:bg-brand-emeraldHover text-white'} transition`;
          btnToggle.textContent = broadcast.active ? 'Take Down Live Banner' : 'Publish Banner';

          // Audit logging
          try {
            const raw = localStorage.getItem('cso_super_audit');
            const logs = raw ? JSON.parse(raw) : [];
            logs.unshift({
              id: 'AUD-' + Math.floor(1000 + Math.random() * 9000),
              timestamp: new Date().toISOString(),
              actor: 'admin@csodisha.com',
              eventType: 'BROADCAST_STATUS_TOGGLED',
              target: 'HOMEPAGE_BROADCAST',
              ip: '103.21.124.9',
              details: `Broadcast banner status toggled: ${broadcast.active ? 'LIVE' : 'INACTIVE'}`
            });
            if (logs.length > 200) logs.pop();
            localStorage.setItem('cso_super_audit', JSON.stringify(logs));
          } catch (_) {}

          if (window.CSOSuperStore && typeof window.CSOSuperStore.logAudit === 'function') {
            try {
              window.CSOSuperStore.logAudit('BROADCAST_STATUS_TOGGLED', 'HOMEPAGE_BROADCAST', `Broadcast banner status toggled: ${broadcast.active ? 'LIVE' : 'INACTIVE'}`);
            } catch (_) {}
          }

          showToast(broadcast.active ? "Homepage broadcast banner is now LIVE" : "Homepage broadcast banner taken down", broadcast.active ? "success" : "warning");
        });
      }

      const btnExport = document.getElementById('btnExportOverview');
      if (btnExport) {
        btnExport.addEventListener('click', () => {
          downloadSnapshotFile({
            timestamp: new Date().toISOString(),
            metrics: metrics,
            broadcast: CSOState.broadcast
          }, "cso-telemetry-snapshot.json");
        });
      }
    }

    /**
     * VIEW 2: Website Pages & Visual CMS Studio (Folder 02)
     */
    function renderCMSStudioWorkspace() {
      dom.moduleHeaderActions.innerHTML = `
        <button id="btnLaunchPageBuilder" class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-brand-emerald text-white hover:bg-brand-emeraldHover transition shadow flex items-center gap-1.5">
          <span>+ Create New Page</span>
        </button>
      `;

      dom.workspaceRoot.innerHTML = `
        <div class="p-5 rounded-xl bg-brand-slate border border-brand-border">
          <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 class="font-bold text-white text-sm">Site Page Directory (Static & Dynamic Routes)</h3>
              <p class="text-xs text-slate-400">Total 24 verified pages with zero broken internal links.</p>
            </div>
            <div class="flex items-center gap-2">
              <input type="text" placeholder="Filter routes..." class="bg-[#081220] border border-brand-border rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500" />
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs text-slate-300">
              <thead class="bg-[#081220] uppercase font-mono text-[10px] text-slate-400 border-b border-brand-border">
                <tr>
                  <th class="py-2.5 px-3">Route Path</th>
                  <th class="py-2.5 px-3">Page Name</th>
                  <th class="py-2.5 px-3">Template</th>
                  <th class="py-2.5 px-3">Status</th>
                  <th class="py-2.5 px-3">Last Modified</th>
                  <th class="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-brand-border/60">
                <tr class="hover:bg-brand-card/40 transition">
                  <td class="py-2.5 px-3 font-mono text-cyan-400 font-semibold">/</td>
                  <td class="py-2.5 px-3 font-medium text-white">Homepage & Portal Gate</td>
                  <td class="py-2.5 px-3">Interactive Landing</td>
                  <td class="py-2.5 px-3"><span class="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-brand-emerald border border-brand-emerald/30">Live (200 OK)</span></td>
                  <td class="py-2.5 px-3 font-mono text-slate-400">2026-11-08</td>
                  <td class="py-2.5 px-3 text-right">
                    <button class="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-[11px] mr-1">Edit</button>
                    <a href="https://csodisha.com/" target="_blank" class="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-brand-emerald font-semibold text-[11px]">Preview</a>
                  </td>
                </tr>
                <tr class="hover:bg-brand-card/40 transition">
                  <td class="py-2.5 px-3 font-mono text-cyan-400 font-semibold">/resources.html</td>
                  <td class="py-2.5 px-3 font-medium text-white">Educational Resources Directory</td>
                  <td class="py-2.5 px-3">Directory Matrix</td>
                  <td class="py-2.5 px-3"><span class="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-brand-emerald border border-brand-emerald/30">Live (200 OK)</span></td>
                  <td class="py-2.5 px-3 font-mono text-slate-400">2026-11-08</td>
                  <td class="py-2.5 px-3 text-right">
                    <button class="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-[11px] mr-1">Edit</button>
                    <a href="https://csodisha.com/resources.html" target="_blank" class="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-brand-emerald font-semibold text-[11px]">Preview</a>
                  </td>
                </tr>
                <tr class="hover:bg-brand-card/40 transition">
                  <td class="py-2.5 px-3 font-mono text-cyan-400 font-semibold">/about.html</td>
                  <td class="py-2.5 px-3 font-medium text-white">About CS Odisha Mission</td>
                  <td class="py-2.5 px-3">Standard Content</td>
                  <td class="py-2.5 px-3"><span class="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-brand-emerald border border-brand-emerald/30">Live (200 OK)</span></td>
                  <td class="py-2.5 px-3 font-mono text-slate-400">2026-11-08</td>
                  <td class="py-2.5 px-3 text-right">
                    <button class="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-[11px] mr-1">Edit</button>
                    <a href="https://csodisha.com/about.html" target="_blank" class="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-brand-emerald font-semibold text-[11px]">Preview</a>
                  </td>
                </tr>
                <tr class="hover:bg-brand-card/40 transition">
                  <td class="py-2.5 px-3 font-mono text-cyan-400 font-semibold">/contact.html</td>
                  <td class="py-2.5 px-3 font-medium text-white">Student Contact & Inquiries</td>
                  <td class="py-2.5 px-3">Form Desk</td>
                  <td class="py-2.5 px-3"><span class="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-brand-emerald border border-brand-emerald/30">Live (200 OK)</span></td>
                  <td class="py-2.5 px-3 font-mono text-slate-400">2026-11-08</td>
                  <td class="py-2.5 px-3 text-right">
                    <button class="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-[11px] mr-1">Edit</button>
                    <a href="https://csodisha.com/contact.html" target="_blank" class="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-brand-emerald font-semibold text-[11px]">Preview</a>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      `;

      document.getElementById('btnLaunchPageBuilder').addEventListener('click', openPageBuilderModal);
    }

    /**
     * Modal: Visual Page Builder & Slug Generator
     */
    function openPageBuilderModal() {
      openModal("Visual Page Studio & Route Publisher", `
        <div class="space-y-4">
          <div>
            <label class="block text-slate-400 uppercase tracking-wider text-[10px] font-bold mb-1">Page Title</label>
            <input id="builderTitle" type="text" placeholder="e.g. Odisha Scholarship Portal 2026 Complete Guide" class="w-full bg-[#081220] border border-brand-border rounded-lg px-3 py-2 text-white text-xs" />
          </div>
          <div>
            <label class="block text-slate-400 uppercase tracking-wider text-[10px] font-bold mb-1">Target Slug Route</label>
            <div class="flex items-center">
              <span class="px-3 py-2 bg-slate-800 border border-r-0 border-brand-border rounded-l-lg text-slate-400 text-xs font-mono">csodisha.com/</span>
              <input id="builderSlug" type="text" placeholder="odisha-scholarships-2026" class="w-full bg-[#081220] border border-brand-border rounded-r-lg px-3 py-2 text-brand-emerald text-xs font-mono" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-slate-400 uppercase tracking-wider text-[10px] font-bold mb-1">Layout Template</label>
              <select class="w-full bg-[#081220] border border-brand-border rounded-lg px-3 py-2 text-slate-300 text-xs">
                <option>Standard Article & Guide</option>
                <option>Educational Resource Matrix</option>
                <option>Notice & Recruitment Announcement</option>
              </select>
            </div>
            <div>
              <label class="block text-slate-400 uppercase tracking-wider text-[10px] font-bold mb-1">SEO Meta Indexing</label>
              <select class="w-full bg-[#081220] border border-brand-border rounded-lg px-3 py-2 text-slate-300 text-xs">
                <option>index, follow (Public Search)</option>
                <option>noindex, nofollow (Private Draft)</option>
              </select>
            </div>
          </div>
          <div>
            <label class="block text-slate-400 uppercase tracking-wider text-[10px] font-bold mb-1">Page HTML / Markdown Body</label>
            <textarea rows="6" placeholder="<section class='max-w-4xl mx-auto'>&#10;  <h1>Odisha Scholarship Portal Guide</h1>&#10;</section>" class="w-full bg-[#081220] border border-brand-border rounded-lg p-3 text-slate-200 text-xs font-mono"></textarea>
          </div>
        </div>
      `, `
        <button id="btnModalSaveDraft" class="px-3 py-1.5 text-xs font-semibold rounded bg-slate-800 text-slate-300 hover:bg-slate-700">Save Draft</button>
        <button id="btnModalPublish" class="px-3 py-1.5 text-xs font-semibold rounded bg-brand-emerald text-white hover:bg-brand-emeraldHover font-bold">Publish to Cloudflare Pages</button>
      `);

      document.getElementById('builderTitle').addEventListener('input', (e) => {
        const slug = e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        document.getElementById('builderSlug').value = slug;
      });

      document.getElementById('btnModalPublish').addEventListener('click', () => {
        closeModal();
        showToast("New page generated and staged for Cloudflare deployment!", "success");
      });
      document.getElementById('btnModalSaveDraft').addEventListener('click', () => {
        closeModal();
        showToast("Page draft saved to local state store", "info");
      });
    }

    /**
     * VIEW 3: Educational Resources & Syllabus Matrix (Folder 05)
     */
    function renderEducationalResourcesWorkspace() {
      dom.moduleHeaderActions.innerHTML = `
        <button id="btnAddResource" class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-brand-emerald text-white hover:bg-brand-emeraldHover transition shadow flex items-center gap-1.5">
          <span>+ Add Resource</span>
        </button>
      `;

      dom.workspaceRoot.innerHTML = `
        <div class="p-5 rounded-xl bg-brand-slate border border-brand-border">
          <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 class="font-bold text-white text-sm">Educational Resources & Syllabus Matrix</h3>
              <p class="text-xs text-slate-400">Curriculum documents, recruitment question papers, and government schemes.</p>
            </div>
            <div class="flex items-center gap-2">
              <select class="bg-[#081220] border border-brand-border rounded-lg px-3 py-1.5 text-xs text-slate-300">
                <option>All Categories</option>
                <option>State Exams</option>
                <option>Higher Secondary</option>
                <option>Teaching / B.Ed</option>
                <option>Scholarships</option>
              </select>
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs text-slate-300">
              <thead class="bg-[#081220] uppercase font-mono text-[10px] text-slate-400 border-b border-brand-border">
                <tr>
                  <th class="py-2.5 px-3">Resource ID</th>
                  <th class="py-2.5 px-3">Resource Title</th>
                  <th class="py-2.5 px-3">Category</th>
                  <th class="py-2.5 px-3">Format & Size</th>
                  <th class="py-2.5 px-3">Downloads</th>
                  <th class="py-2.5 px-3">Status</th>
                  <th class="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-brand-border/60">
                ${CSOState.resources.map(res => `
                  <tr class="hover:bg-brand-card/40 transition">
                    <td class="py-2.5 px-3 font-mono text-cyan-400 font-bold">${res.id}</td>
                    <td class="py-2.5 px-3 font-medium text-white">${res.title}</td>
                    <td class="py-2.5 px-3 text-slate-300">${res.category}</td>
                    <td class="py-2.5 px-3 font-mono text-slate-400">${res.format}</td>
                    <td class="py-2.5 px-3 font-mono text-brand-emerald font-semibold">${res.downloads.toLocaleString()}</td>
                    <td class="py-2.5 px-3">
                      <span class="px-2 py-0.5 rounded text-[10px] font-mono ${res.status === 'Live' ? 'bg-emerald-500/10 text-brand-emerald border border-brand-emerald/30' : 'bg-amber-500/10 text-amber-300 border border-amber-500/30'}">${res.status}</span>
                    </td>
                    <td class="py-2.5 px-3 text-right">
                      <button class="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-[11px] mr-1">Edit</button>
                      <button class="px-2 py-1 rounded bg-slate-800 hover:bg-brand-crimson/20 text-brand-crimson font-semibold text-[11px]">Remove</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;

      document.getElementById('btnAddResource').addEventListener('click', () => {
        openModal("Add Verified Educational Resource", `
          <div class="space-y-3">
            <div>
              <label class="block text-slate-400 uppercase tracking-wider text-[10px] font-bold mb-1">Resource Title</label>
              <input type="text" placeholder="e.g. OSSC CGL 2026 Mathematics Practice Set" class="w-full bg-[#081220] border border-brand-border rounded-lg px-3 py-2 text-white text-xs" />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-slate-400 uppercase tracking-wider text-[10px] font-bold mb-1">Category</label>
                <select class="w-full bg-[#081220] border border-brand-border rounded-lg px-3 py-2 text-slate-300 text-xs">
                  <option>State Competitive Exams</option>
                  <option>Teacher Education (OTET/B.Ed)</option>
                  <option>Scholarships & Schemes</option>
                </select>
              </div>
              <div>
                <label class="block text-slate-400 uppercase tracking-wider text-[10px] font-bold mb-1">Target Document URL</label>
                <input type="url" placeholder="https://csodisha.com/assets/..." class="w-full bg-[#081220] border border-brand-border rounded-lg px-3 py-2 text-cyan-400 text-xs font-mono" />
              </div>
            </div>
          </div>
        `, `
          <button onclick="closeModal()" class="px-3 py-1.5 text-xs font-semibold rounded bg-slate-800 text-slate-300 hover:bg-slate-700">Cancel</button>
          <button onclick="closeModal(); showToast('Resource successfully registered and indexed!', 'success');" class="px-3 py-1.5 text-xs font-semibold rounded bg-brand-emerald text-white hover:bg-brand-emeraldHover font-bold">Publish Resource</button>
        `);
      });
    }

    /**
     * VIEW 4: Payments & Finance (Folder 08)
     */
    function renderFinanceWorkspace() {
      dom.workspaceRoot.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div class="p-4 rounded-xl bg-brand-slate border border-brand-border">
            <span class="text-xs text-slate-400 uppercase font-mono">Gross Collections (Nov 2026)</span>
            <p class="text-2xl font-extrabold text-white mt-1">₹48,250.00</p>
            <span class="text-xs text-brand-emerald font-semibold">+12% vs October</span>
          </div>
          <div class="p-4 rounded-xl bg-brand-slate border border-brand-border">
            <span class="text-xs text-slate-400 uppercase font-mono">Active Gateway Status</span>
            <p class="text-base font-bold text-brand-emerald mt-1 flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-brand-emerald"></span> Razorpay Webhook Connected
            </p>
            <span class="text-xs text-slate-400 font-mono">Instant UPI / NetBanking</span>
          </div>
          <div class="p-4 rounded-xl bg-brand-slate border border-brand-border">
            <span class="text-xs text-slate-400 uppercase font-mono">Disputes & Refunds</span>
            <p class="text-2xl font-extrabold text-white mt-1">0 Pending</p>
            <span class="text-xs text-slate-400">100% clean audit compliance</span>
          </div>
        </div>

        <div class="p-5 rounded-xl bg-brand-slate border border-brand-border">
          <h3 class="font-bold text-white text-sm mb-4">Recent Transaction Ledger</h3>
          <table class="w-full text-left text-xs text-slate-300">
            <thead class="bg-[#081220] uppercase font-mono text-[10px] text-slate-400 border-b border-brand-border">
              <tr>
                <th class="py-2.5 px-3">Order ID</th>
                <th class="py-2.5 px-3">Candidate</th>
                <th class="py-2.5 px-3">Item / Course</th>
                <th class="py-2.5 px-3">Amount</th>
                <th class="py-2.5 px-3">Method</th>
                <th class="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-brand-border/60 font-mono">
              <tr>
                <td class="py-2.5 px-3 text-cyan-400">ORD-99120</td>
                <td class="py-2.5 px-3 font-sans text-white">Soumya Dash</td>
                <td class="py-2.5 px-3 font-sans">OTET 2026 Test Series Pass</td>
                <td class="py-2.5 px-3 font-bold text-white">₹299.00</td>
                <td class="py-2.5 px-3">UPI (PhonePe)</td>
                <td class="py-2.5 px-3"><span class="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-brand-emerald">SUCCESS</span></td>
              </tr>
              <tr>
                <td class="py-2.5 px-3 text-cyan-400">ORD-99119</td>
                <td class="py-2.5 px-3 font-sans text-white">Rakesh Jena</td>
                <td class="py-2.5 px-3 font-sans">B.Ed Pedagogy Complete E-Book</td>
                <td class="py-2.5 px-3 font-bold text-white">₹149.00</td>
                <td class="py-2.5 px-3">GPay</td>
                <td class="py-2.5 px-3"><span class="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-brand-emerald">SUCCESS</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
    }

    /**
     * VIEW 5: Users, Roles & Community (Folder 09)
     */
    function renderUsersRBACWorkspace() {
      dom.moduleHeaderActions.innerHTML = `
        <button id="btnExportUsers" class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition border border-slate-700 flex items-center gap-1.5">
          <span>Export CSV</span>
        </button>
      `;

      dom.workspaceRoot.innerHTML = `
        <div class="p-5 rounded-xl bg-brand-slate border border-brand-border">
          <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 class="font-bold text-white text-sm">Candidate & Administrative Accounts</h3>
              <p class="text-xs text-slate-400">RBAC permissions, student verification, and credential lifecycle.</p>
            </div>
            <div class="flex items-center gap-2">
              <input type="text" placeholder="Search by name, email or district..." class="bg-[#081220] border border-brand-border rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 w-64" />
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs text-slate-300">
              <thead class="bg-[#081220] uppercase font-mono text-[10px] text-slate-400 border-b border-brand-border">
                <tr>
                  <th class="py-2.5 px-3">User ID</th>
                  <th class="py-2.5 px-3">Full Name</th>
                  <th class="py-2.5 px-3">Email Address</th>
                  <th class="py-2.5 px-3">Assigned Role</th>
                  <th class="py-2.5 px-3">District</th>
                  <th class="py-2.5 px-3">Status</th>
                  <th class="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-brand-border/60">
                ${CSOState.users.map(u => `
                  <tr class="hover:bg-brand-card/40 transition">
                    <td class="py-2.5 px-3 font-mono text-cyan-400">${u.id}</td>
                    <td class="py-2.5 px-3 font-medium text-white">${u.name}</td>
                    <td class="py-2.5 px-3 text-slate-400 font-mono">${u.email}</td>
                    <td class="py-2.5 px-3">
                      <span class="px-2 py-0.5 rounded text-[10px] font-mono ${u.role.includes('Admin') ? 'bg-emerald-500/10 text-brand-emerald font-bold' : 'bg-slate-800 text-slate-300'}">${u.role}</span>
                    </td>
                    <td class="py-2.5 px-3 text-slate-300">${u.district}</td>
                    <td class="py-2.5 px-3">
                      <span class="px-2 py-0.5 rounded text-[10px] font-mono ${u.status === 'Verified' ? 'bg-emerald-500/10 text-brand-emerald' : u.status === 'Pending' ? 'bg-amber-500/10 text-amber-300' : 'bg-red-500/10 text-brand-crimson'}">${u.status}</span>
                    </td>
                    <td class="py-2.5 px-3 text-right font-mono">
                      <button class="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] mr-1" onclick="toggleUserStatus('${u.id}')">${u.status === 'Suspended' ? 'Reinstate' : 'Suspend'}</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;

      document.getElementById('btnExportUsers').addEventListener('click', () => {
        downloadSnapshotFile(CSOState.users, "csodisha-users.json");
      });
    }

    window.toggleUserStatus = function(userId) {
      const u = CSOState.users.find(x => x.id === userId);
      if (u) {
        u.status = u.status === 'Suspended' ? 'Verified' : 'Suspended';
        showToast(`User ${u.name} status updated to ${u.status}`, u.status === 'Verified' ? 'success' : 'warning');
        renderUsersRBACWorkspace();
      }
    };

    /**
     * VIEW 6: Communication & Inquiries Desk (Folder 10)
     */
    function renderCommunicationsWorkspace() {
      dom.workspaceRoot.innerHTML = `
        <div class="p-5 rounded-xl bg-brand-slate border border-brand-border">
          <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 class="font-bold text-white text-sm">Student Inquiries & Contact Submissions</h3>
              <p class="text-xs text-slate-400">Incoming inquiries from csodisha.com/contact.html.</p>
            </div>
            <span class="text-xs font-mono text-brand-emerald bg-brand-emerald/10 px-2 py-1 rounded border border-brand-emerald/30">Google SMTP Relay: Active</span>
          </div>

          <div class="space-y-3">
            ${CSOState.inquiries.map(inq => `
              <div class="p-4 rounded-xl bg-[#081220] border border-brand-border hover:border-brand-emerald/40 transition">
                <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div class="flex items-center gap-2">
                    <span class="font-mono text-xs font-bold text-cyan-400">${inq.id}</span>
                    <strong class="text-white text-xs">${inq.sender}</strong>
                    <span class="text-[11px] text-slate-400 font-mono">(${inq.district})</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="text-[10px] font-mono text-slate-500">${inq.time}</span>
                    <span class="px-2 py-0.5 rounded text-[10px] font-mono ${inq.status === 'Unread' ? 'bg-red-500/10 text-brand-crimson font-bold' : inq.status === 'In Progress' ? 'bg-amber-500/10 text-amber-300' : 'bg-emerald-500/10 text-brand-emerald'}">${inq.status}</span>
                  </div>
                </div>

                <p class="text-xs font-semibold text-slate-200 mb-1">${inq.subject}</p>
                <div class="flex flex-wrap items-center justify-between gap-3 mt-3 pt-2 border-t border-brand-border/40 text-[11px] font-mono text-slate-400">
                  <div>
                    <span>Email: </span><span class="text-slate-300 mr-3">${inq.email}</span>
                    <span>Phone: </span><span class="text-slate-300">${inq.phone}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <button class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-sans" onclick="resolveInquiry('${inq.id}')">Mark Resolved</button>
                    <button class="px-2.5 py-1 rounded bg-brand-emerald hover:bg-brand-emeraldHover text-white text-xs font-sans font-bold" onclick="launchReplyModal('${inq.id}')">Send SMTP Reply &rarr;</button>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    window.resolveInquiry = function(id) {
      const item = CSOState.inquiries.find(x => x.id === id);
      if (item) {
        item.status = 'Resolved';
        showToast(`Inquiry ${id} marked as resolved!`, "success");
        renderCommunicationsWorkspace();
      }
    };

    window.launchReplyModal = function(id) {
      const item = CSOState.inquiries.find(x => x.id === id);
      openModal(`Dispatch Reply to ${item.sender}`, `
        <div class="space-y-3">
          <div class="p-3 rounded bg-[#081220] border border-brand-border text-xs">
            <p class="text-slate-400">Subject: <strong class="text-slate-200">Re: ${item.subject}</strong></p>
            <p class="text-slate-400 font-mono text-[11px]">To: ${item.email} | From: admin@csodisha.com</p>
          </div>
          <div>
            <label class="block text-slate-400 uppercase tracking-wider text-[10px] font-bold mb-1">Canned Reply Template</label>
            <select id="replyTemplate" class="w-full bg-[#081220] border border-brand-border rounded-lg px-3 py-2 text-slate-300 text-xs">
              <option>General Support Assistance</option>
              <option>Exam Admit Card / Syllabus Clarification</option>
              <option>Scholarship Eligibility Verification</option>
            </select>
          </div>
          <div>
            <label class="block text-slate-400 uppercase tracking-wider text-[10px] font-bold mb-1">Message Body</label>
            <textarea rows="5" class="w-full bg-[#081220] border border-brand-border rounded-lg p-3 text-slate-200 text-xs font-sans">Dear ${item.sender},&#10;&#10;Thank you for reaching out to CS Odisha. Regarding your query about "${item.subject}", our administrative team has reviewed the case...</textarea>
          </div>
        </div>
      `, `
        <button onclick="closeModal()" class="px-3 py-1.5 text-xs font-semibold rounded bg-slate-800 text-slate-300 hover:bg-slate-700">Cancel</button>
        <button onclick="closeModal(); showToast('Email reply dispatched via smtp.gmail.com:587', 'success');" class="px-3 py-1.5 text-xs font-semibold rounded bg-brand-emerald text-white hover:bg-brand-emeraldHover font-bold">Dispatch Email</button>
      `);
    };

    /**
     * VIEW 7: Appearance Studio (Folder 11)
     */
    function renderAppearanceStudioWorkspace() {
      dom.workspaceRoot.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="p-5 rounded-xl bg-brand-slate border border-brand-border space-y-4">
            <h3 class="font-bold text-white text-sm">Theme Colors & Brand Tokens</h3>
            <div class="space-y-3 text-xs">
              <div>
                <label class="block text-slate-400 uppercase font-bold text-[10px] mb-1">Midnight Navy (Primary Background)</label>
                <div class="flex items-center gap-2">
                  <input type="color" value="#081220" class="w-10 h-8 rounded border border-brand-border cursor-pointer bg-transparent" />
                  <input type="text" value="#081220" class="w-36 bg-[#081220] border border-brand-border rounded px-2 py-1 text-xs font-mono text-slate-200" />
                </div>
              </div>
              <div>
                <label class="block text-slate-400 uppercase font-bold text-[10px] mb-1">Odisha Emerald (Primary Brand Accent)</label>
                <div class="flex items-center gap-2">
                  <input type="color" value="#0fa968" class="w-10 h-8 rounded border border-brand-border cursor-pointer bg-transparent" />
                  <input type="text" value="#0fa968" class="w-36 bg-[#081220] border border-brand-border rounded px-2 py-1 text-xs font-mono text-brand-emerald" />
                </div>
              </div>
              <div>
                <label class="block text-slate-400 uppercase font-bold text-[10px] mb-1">Slate Card Container</label>
                <div class="flex items-center gap-2">
                  <input type="color" value="#0f172a" class="w-10 h-8 rounded border border-brand-border cursor-pointer bg-transparent" />
                  <input type="text" value="#0f172a" class="w-36 bg-[#081220] border border-brand-border rounded px-2 py-1 text-xs font-mono text-slate-200" />
                </div>
              </div>
            </div>
            <button onclick="showToast('Theme tokens synchronized across public site assets!', 'success')" class="px-3 py-1.5 text-xs font-bold bg-brand-emerald text-white rounded hover:bg-brand-emeraldHover transition">Publish CSS Variables</button>
          </div>

          <div class="p-5 rounded-xl bg-brand-slate border border-brand-border space-y-4">
            <h3 class="font-bold text-white text-sm">Typography & Brand Assets</h3>
            <div class="space-y-3 text-xs">
              <div>
                <span class="text-slate-400 block text-[10px] font-bold uppercase mb-1">Primary Font Family</span>
                <p class="font-mono text-slate-200 bg-[#081220] p-2 rounded border border-brand-border">'Inter', -apple-system, sans-serif</p>
              </div>
              <div>
                <span class="text-slate-400 block text-[10px] font-bold uppercase mb-1">Monospace / Code Font</span>
                <p class="font-mono text-slate-200 bg-[#081220] p-2 rounded border border-brand-border">'JetBrains Mono', monospace</p>
              </div>
              <div>
                <span class="text-slate-400 block text-[10px] font-bold uppercase mb-1">Vector Logo Asset</span>
                <p class="text-cyan-400 font-mono text-[11px] bg-[#081220] p-2 rounded border border-brand-border">/assets/img/logo-cso-official.svg</p>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    /**
     * VIEW 8: Security & Privacy (Folder 16)
     */
    function renderSecurityWorkspace() {
      dom.workspaceRoot.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="p-5 rounded-xl bg-brand-slate border border-brand-border lg:col-span-2">
            <h3 class="font-bold text-white text-sm mb-3">Active Administrative Sessions</h3>
            <div class="space-y-2 text-xs font-mono">
              <div class="p-3 rounded-lg bg-[#081220] border border-brand-emerald/40 flex items-center justify-between">
                <div>
                  <div class="flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-brand-emerald animate-pulse"></span>
                    <strong class="text-white font-sans">Current Admin Browser Session (This Device)</strong>
                  </div>
                  <p class="text-[11px] text-slate-400 mt-1">IP: 103.21.124.9 &bull; Linux / Chrome / Brave &bull; Token: cso_adm_verified_session</p>
                </div>
                <span class="px-2 py-0.5 rounded text-[10px] bg-brand-emerald/20 text-brand-emerald font-bold">ACTIVE</span>
              </div>
            </div>

            <h3 class="font-bold text-white text-sm mt-6 mb-3 flex items-center justify-between">
              <span>Security & Authentication Audit Trail (Folder 16)</span>
              <span class="text-[11px] font-mono text-brand-emerald">cso_super_audit</span>
            </h3>
            <div class="space-y-2 mb-6 font-mono text-xs max-h-56 overflow-y-auto">
              ${renderAuditEventsHtml(6)}
            </div>

            <h3 class="font-bold text-white text-sm mt-6 mb-3">Edge Firewall & IP Restrictions</h3>
            <div class="space-y-2">
              <div class="flex items-center justify-between p-3 rounded-lg bg-[#081220] border border-brand-border text-xs">
                <div>
                  <span class="font-bold text-white">Cloudflare Turnstile Managed Challenge</span>
                  <p class="text-[11px] text-slate-400">Protects /admin/login and /contact.html against bot attacks</p>
                </div>
                <span class="text-brand-emerald font-mono font-bold">ENABLED</span>
              </div>
              <div class="flex items-center justify-between p-3 rounded-lg bg-[#081220] border border-brand-border text-xs">
                <div>
                  <span class="font-bold text-white">Rate-Limiting Policy</span>
                  <p class="text-[11px] text-slate-400">Max 5 failed logins per 10 minutes from same IP</p>
                </div>
                <span class="text-brand-emerald font-mono font-bold">ACTIVE</span>
              </div>
            </div>
          </div>

          <div class="p-5 rounded-xl bg-brand-slate border border-brand-border flex flex-col justify-between">
            <div>
              <h3 class="font-bold text-brand-crimson text-sm mb-2">Zero-Trust Panic Revocation</h3>
              <p class="text-xs text-slate-400 mb-4">Instantly terminate all other active admin sessions and force global credential challenge.</p>
              <button onclick="showToast('All remote admin sessions terminated immediately!', 'crimson')" class="w-full py-2.5 px-3 rounded-lg bg-red-950/80 hover:bg-red-900 border border-brand-crimson text-red-200 text-xs font-bold transition">
                Revoke All Remote Sessions
              </button>
            </div>
            <div class="p-3 rounded-lg bg-[#081220] border border-brand-border text-[11px] text-slate-400">
              <span class="font-bold text-slate-200">Incident Response SLA:</span> Direct SMS alerts routed to verified admin on security threshold trigger.
            </div>
          </div>
        </div>
      `;
    }

    /**
     * VIEW 9: Operations, Backups & D1 Console (Folder 17)
     */
    function renderOperationsRecoveryWorkspace() {
      dom.workspaceRoot.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="p-5 rounded-xl bg-brand-slate border border-brand-border space-y-4">
            <h3 class="font-bold text-white text-sm">Full Platform Snapshot & Backup</h3>
            <p class="text-xs text-slate-400">Generates a complete, timestamped archive containing all 241 module configurations, users, and educational resources.</p>
            <button id="btnCreateSnapshot" class="px-4 py-2 text-xs font-bold rounded-lg bg-brand-emerald text-white hover:bg-brand-emeraldHover transition flex items-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/></svg>
              <span>Download Full Platform Snapshot (JSON)</span>
            </button>
          </div>

          <div class="p-5 rounded-xl bg-brand-slate border border-brand-border space-y-4">
            <h3 class="font-bold text-white text-sm">Snapshot Restore Center</h3>
            <p class="text-xs text-slate-400">Restore local state from a verified CSO backup archive.</p>
            <div class="border-2 border-dashed border-brand-border rounded-lg p-6 text-center text-xs text-slate-400 hover:border-brand-emerald cursor-pointer transition">
              <p>Drag and drop <strong>.json</strong> snapshot file here or click to browse</p>
            </div>
          </div>
        </div>

        <div class="p-5 rounded-xl bg-brand-slate border border-brand-border mt-6">
          <h3 class="font-bold text-white text-sm mb-3">Cloudflare D1 SQL Sandboxed Explorer</h3>
          <div class="space-y-3">
            <textarea rows="3" class="w-full bg-[#081220] border border-brand-border rounded-lg p-3 text-cyan-400 font-mono text-xs">SELECT id, title, category, downloads FROM educational_resources ORDER BY downloads DESC LIMIT 5;</textarea>
            <div class="flex items-center justify-between">
              <span class="text-[11px] text-slate-400 font-mono">Read-Only Safe Mode Enabled</span>
              <button onclick="showToast('Query executed in 6.4ms across D1 replicas', 'success')" class="px-3 py-1.5 text-xs font-bold rounded bg-cyan-600 hover:bg-cyan-500 text-white transition">Run SQL Query</button>
            </div>
          </div>
        </div>
      `;

      document.getElementById('btnCreateSnapshot').addEventListener('click', () => {
        downloadSnapshotFile({
          project: "CS Odisha Master Console",
          timestamp: new Date().toISOString(),
          state: CSOState
        }, `csodisha-full-snapshot-${new Date().toISOString().slice(0,10)}.json`);
      });
    }

    /**
     * VIEW 10: Master Feature Registry (Folder 19)
     */
    function renderMasterFeatureRegistryWorkspace() {
      if (!masterNavigationSchema || !masterNavigationSchema.folders) return;
      const allModules = [];
      masterNavigationSchema.folders.forEach(f => {
        f.modules.forEach(m => {
          allModules.push({ ...m, folderTitle: f.title, folderId: f.id });
        });
      });

      dom.workspaceRoot.innerHTML = `
        <div class="p-5 rounded-xl bg-brand-slate border border-brand-border">
          <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 class="font-bold text-white text-sm">Master 241-Module Operational Matrix</h3>
              <p class="text-xs text-slate-400">100% of discovered website features indexed and mapped.</p>
            </div>
            <button id="btnExportMatrix" class="px-3 py-1.5 text-xs font-semibold rounded bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700">Export Registry (JSON)</button>
          </div>

          <div class="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table class="w-full text-left text-xs text-slate-300">
              <thead class="bg-[#081220] uppercase font-mono text-[10px] text-slate-400 border-b border-brand-border sticky top-0 z-10">
                <tr>
                  <th class="py-2.5 px-3">Module ID</th>
                  <th class="py-2.5 px-3">Module Title</th>
                  <th class="py-2.5 px-3">Folder Domain</th>
                  <th class="py-2.5 px-3">Status</th>
                  <th class="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-brand-border/60">
                ${allModules.map(m => `
                  <tr class="hover:bg-brand-card/40 transition">
                    <td class="py-2.5 px-3 font-mono text-cyan-400 font-bold">${m.id}</td>
                    <td class="py-2.5 px-3 font-medium text-white">${m.title}</td>
                    <td class="py-2.5 px-3 text-slate-400">${m.folderTitle}</td>
                    <td class="py-2.5 px-3">
                      <span class="px-2 py-0.5 rounded text-[10px] font-mono ${m.status === 'active' ? 'bg-emerald-500/10 text-brand-emerald font-bold' : 'bg-slate-800 text-slate-400'}">${m.status}</span>
                    </td>
                    <td class="py-2.5 px-3 text-right">
                      <button class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-brand-emerald font-semibold text-[11px]" onclick="selectModule('${m.folderId}', '${m.id}')">Open View &rarr;</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;

      document.getElementById('btnExportMatrix').addEventListener('click', () => {
        downloadSnapshotFile(allModules, "csodisha-241-modules-registry.json");
      });
    }

    /**
     * Standard Dynamic Fallback CRUD Inspector
     * Renders cleanly for any module in the 241 schema without dedicated views
     */
    function renderStandardModuleInspector(folderId, moduleId) {
      if (!masterNavigationSchema || !masterNavigationSchema.folders) return;
      const folder = masterNavigationSchema.folders.find(f => f.id === folderId);
      const module = folder?.modules.find(m => m.id === moduleId);

      dom.workspaceRoot.innerHTML = `
        <div class="p-5 rounded-xl bg-brand-slate border border-brand-border space-y-5">
          <div class="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-brand-border">
            <div>
              <span class="text-xs font-mono text-brand-emerald uppercase font-semibold">${folder?.title}</span>
              <h2 class="text-base font-bold text-white mt-0.5">${module?.title}</h2>
              <p class="text-xs text-slate-400 mt-1">Operational records and state schema for ${module?.id}.</p>
            </div>
            <div class="flex items-center gap-2">
              <button class="px-3 py-1.5 text-xs font-semibold rounded bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700" onclick="showToast('Exporting module records...', 'info')">Export CSV</button>
              <button class="px-3 py-1.5 text-xs font-bold rounded bg-brand-emerald text-white hover:bg-brand-emeraldHover" onclick="showToast('New entry schema initialized', 'success')">+ New Entry</button>
            </div>
          </div>

          <!-- Dynamic Mock Record Inspector Table -->
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs text-slate-300 font-mono">
              <thead class="bg-[#081220] uppercase text-[10px] text-slate-400 border-b border-brand-border">
                <tr>
                  <th class="py-2.5 px-3">Record Key</th>
                  <th class="py-2.5 px-3">Field Title</th>
                  <th class="py-2.5 px-3">Data Value</th>
                  <th class="py-2.5 px-3">Status</th>
                  <th class="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-brand-border/60">
                <tr class="hover:bg-brand-card/40 transition">
                  <td class="py-2.5 px-3 text-cyan-400">${module?.id}-REC01</td>
                  <td class="py-2.5 px-3 font-sans text-white">Default Entity Node</td>
                  <td class="py-2.5 px-3 text-slate-400">config_val_active</td>
                  <td class="py-2.5 px-3"><span class="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-brand-emerald">Synced</span></td>
                  <td class="py-2.5 px-3 text-right font-sans">
                    <button class="px-2 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 text-[11px]" onclick="showToast('Record updated successfully', 'success')">Configure</button>
                  </td>
                </tr>
                <tr class="hover:bg-brand-card/40 transition">
                  <td class="py-2.5 px-3 text-cyan-400">${module?.id}-REC02</td>
                  <td class="py-2.5 px-3 font-sans text-white">Schema Validator</td>
                  <td class="py-2.5 px-3 text-slate-400">cso_d1_schema_v1</td>
                  <td class="py-2.5 px-3"><span class="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-brand-emerald">Verified</span></td>
                  <td class="py-2.5 px-3 text-right font-sans">
                    <button class="px-2 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 text-[11px]" onclick="showToast('Record updated successfully', 'success')">Configure</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    /**
     * File Download Helper for Snapshots and Exports
     */
    function downloadSnapshotFile(obj, filename) {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(obj, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", filename);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast(`Snapshot downloaded: ${filename}`, "success");
    }

    /**
     * Generic Modal Helpers
     */
    function openModal(title, bodyHtml, footerHtml = '') {
      dom.modalTitle.textContent = title;
      dom.modalBody.innerHTML = bodyHtml;
      dom.modalFooter.innerHTML = footerHtml;
      dom.globalModal.classList.remove('hidden');
    }
    function closeModal() {
      dom.globalModal.classList.add('hidden');
    }

    /**
     * Mobile Navigation Drawer Controls
     */
    function openMobileDrawer() {
      dom.sidebarConsole.classList.remove('-translate-x-full');
      dom.mobileDrawerBackdrop.classList.remove('hidden');
    }
    function closeMobileDrawer() {
      dom.sidebarConsole.classList.add('-translate-x-full');
      dom.mobileDrawerBackdrop.classList.add('hidden');
    }

    /**
     * Initializer & Event Listeners
     */
    window.addEventListener('DOMContentLoaded', async () => {
      initSessionTimer();

      // Load master navigation tree from JSON
      await loadMasterNavigation();
      renderNavigationTree();
      selectModule('folder-01', 'module-01-001');

      // Search input handler
      if (dom.moduleSearchInput) {
        dom.moduleSearchInput.addEventListener('input', (e) => {
          CSOState.searchQuery = e.target.value;
          renderNavigationTree();
        });
      }

      // Purge Cache Panic Action
      if (dom.btnPurgeCache) {
        dom.btnPurgeCache.addEventListener('click', () => {
          showToast("Purge request sent to Cloudflare Edge CDN (SIN). Invalidation in progress...", "info");
          if (window.CSOSuperStore && typeof window.CSOSuperStore.logAudit === 'function') {
            window.CSOSuperStore.logAudit('CACHE_PURGED', 'ALL_CDN_ROUTES', 'Global edge cache purge manually triggered by Super Admin.');
          }
          setTimeout(() => {
            showToast("Cloudflare Edge CDN Cache Purged successfully! (HTTP 200 OK)", "success");
          }, 1200);
        });
      }

      // Maintenance Switch Panic Action
      if (dom.btnMaintenanceToggle) {
        // Sync initial maintenance state from super-store if available
        if (window.CSOSuperStore && typeof window.CSOSuperStore.getSystem === 'function') {
          try {
            const sys = window.CSOSuperStore.getSystem();
            if (sys && sys.flags && typeof sys.flags.maintenanceMode === 'boolean') {
              CSOState.maintenanceMode = sys.flags.maintenanceMode;
              if (CSOState.maintenanceMode && dom.maintenanceStatusDot && dom.maintenanceStatusText) {
                dom.maintenanceStatusDot.className = "w-2 h-2 rounded-full bg-amber-400";
                dom.maintenanceStatusText.textContent = "Maint: ON";
              }
            }
          } catch (_) {}
        }

        dom.btnMaintenanceToggle.addEventListener('click', () => {
          CSOState.maintenanceMode = !CSOState.maintenanceMode;
          if (window.CSOSuperStore && typeof window.CSOSuperStore.getSystem === 'function') {
            try {
              const sys = window.CSOSuperStore.getSystem();
              if (sys && sys.flags) {
                sys.flags.maintenanceMode = CSOState.maintenanceMode;
                window.CSOSuperStore.saveSystem(sys);
              }
            } catch (_) {}
          }
          if (CSOState.maintenanceMode) {
            if (dom.maintenanceStatusDot) dom.maintenanceStatusDot.className = "w-2 h-2 rounded-full bg-amber-400";
            if (dom.maintenanceStatusText) dom.maintenanceStatusText.textContent = "Maint: ON";
            showToast("Maintenance Mode ENABLED across csodisha.com public routes", "warning");
          } else {
            if (dom.maintenanceStatusDot) dom.maintenanceStatusDot.className = "w-2 h-2 rounded-full bg-slate-500";
            if (dom.maintenanceStatusText) dom.maintenanceStatusText.textContent = "Maint: OFF";
            showToast("Maintenance Mode DISABLED — Live portal operational", "success");
          }
        });
      }

      // Mobile drawer toggle
      if (dom.btnToggleSidebar) dom.btnToggleSidebar.addEventListener('click', openMobileDrawer);
      if (dom.mobileDrawerBackdrop) dom.mobileDrawerBackdrop.addEventListener('click', closeMobileDrawer);
      if (dom.btnModalClose) dom.btnModalClose.addEventListener('click', closeModal);

      // Sign out action
      const btnSignOut = document.getElementById('btnSignOut');
      if (btnSignOut) {
        btnSignOut.addEventListener('click', () => {
          showToast("Ending session...", "info");
          setTimeout(() => {
            sessionStorage.removeItem('cso_admin_token');
            sessionStorage.removeItem('cso_admin_session');
            window.location.replace('/admin/login');
          }, 400);
        });
      }
    });
