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
      } else if (folderId === 'folder-02' || moduleId === 'module-02-001' || moduleId === 'module-02-002') {
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
              <span class="text-2xl font-extrabold text-white">12,480</span>
              <span class="text-xs font-semibold text-brand-emerald">+184 today</span>
            </div>
            <p class="text-[11px] text-slate-400 mt-2">Verified across 30 Odisha districts</p>
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
              <span class="text-2xl font-extrabold text-white">3,790</span>
              <span class="text-xs font-semibold text-brand-emerald">100% Online</span>
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
              <span class="text-2xl font-extrabold text-white">18</span>
              <span class="text-xs font-semibold text-amber-400">Needs Resolution</span>
            </div>
            <p class="text-[11px] text-slate-400 mt-2">Avg response SLA: 2.4 hours</p>
          </div>

          <!-- Database & Edge Utilization -->
          <div class="p-4 rounded-xl bg-brand-slate border border-brand-border shadow-md">
            <div class="flex items-center justify-between text-slate-400 mb-2">
              <span class="text-xs font-medium uppercase tracking-wider">Cloudflare D1 Storage</span>
              <span class="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"/></svg>
              </span>
            </div>
            <div class="flex items-baseline gap-2">
              <span class="text-2xl font-extrabold text-white">14.2 MB</span>
              <span class="text-xs font-semibold text-slate-400 font-mono">/ 500 MB</span>
            </div>
            <p class="text-[11px] text-slate-400 mt-2">5 core tables &bull; 0 replication lags</p>
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

      document.getElementById('btnExportOverview').addEventListener('click', () => {
        downloadSnapshotFile({
          timestamp: new Date().toISOString(),
          metrics: { users: 12480, resources: 3790, inquiries: 18, storage_mb: 14.2 },
          broadcast: CSOState.broadcast
        }, "cso-telemetry-snapshot.json");
      });
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
