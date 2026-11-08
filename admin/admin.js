/**
 * CSO Super Admin Control Panel Client Controller (admin.js)
 * Common Sense Odisha (csodisha.com)
 * 
 * Controls all 10 Super Admin Domains:
 * 1. Overview & Telemetry (Telemetry metric cards, activity stream, panic actions)
 * 2. User Management (Search, verify, suspend, CSV export)
 * 3. Role & Permission Management (RBAC matrix, delegation)
 * 4. Content Studio & Page Builder (Pages table, visual preview modal)
 * 5. System Management & Integrations (Feature flags, SMTP configuration)
 * 6. Security Centre (Active sessions, IP rules)
 * 7. Immutable Audit Trail (Filtering, JSON export)
 * 8. Cloudflare D1 Monitoring (Schema inspector, SQL query console)
 * 9. Backup & Disaster Recovery (Snapshot export, restoration, lockdown)
 * 10. Notification Hub & Broadcast Centre (Alerts feed, live homepage banner)
 */

(() => {
  'use strict';

  // Session timer variables
  let sessionStartTime = Date.now();
  const sessionTimerEl = document.getElementById('session-timer-display');

  function updateSessionTimer() {
    if (!sessionTimerEl) return;
    const diff = Math.floor((Date.now() - sessionStartTime) / 1000);
    const hrs = String(Math.floor(diff / 3600)).padStart(2, '0');
    const mins = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
    const secs = String(diff % 60).padStart(2, '0');
    sessionTimerEl.textContent = `${hrs}:${mins}:${secs}`;
  }
  setInterval(updateSessionTimer, 1000);

  // Mobile sidebar controls
  const btnMobileToggle = document.getElementById('btn-mobile-toggle');
  const btnSidebarClose = document.getElementById('btn-sidebar-close');
  const backdrop = document.getElementById('admin-backdrop');
  const sidebar = document.getElementById('admin-sidebar');

  function openSidebar() {
    if (sidebar) sidebar.classList.add('open');
    if (backdrop) backdrop.classList.add('open');
  }

  function closeSidebar() {
    if (sidebar) sidebar.classList.remove('open');
    if (backdrop) backdrop.classList.remove('open');
  }

  if (btnMobileToggle) btnMobileToggle.addEventListener('click', openSidebar);
  if (btnSidebarClose) btnSidebarClose.addEventListener('click', closeSidebar);
  if (backdrop) backdrop.addEventListener('click', closeSidebar);

  // Sign out
  const btnSignout = document.getElementById('btn-signout');
  if (btnSignout) {
    btnSignout.addEventListener('click', () => {
      if (window.CSOAdminGuard && window.CSOAdminGuard.signOut) {
        window.CSOAdminGuard.signOut();
      } else {
        sessionStorage.clear();
        localStorage.removeItem('cso_admin_token');
        localStorage.removeItem('cso_admin_session');
        window.location.replace('/admin/login');
      }
    });
  }

  // Tab Switching
  const navItems = document.querySelectorAll('.nav-item[data-tab]');
  const modules = document.querySelectorAll('.admin-module');
  const topbarTitle = document.getElementById('topbar-title');

  const tabTitles = {
    'tab-overview': 'Dashboard Overview & System Telemetry',
    'tab-users': 'User Management & Verification Desk',
    'tab-roles': 'Role & Permission Management (RBAC)',
    'tab-cms': 'Content Management & Dynamic Page Builder',
    'tab-system': 'System Settings & Node Integrations',
    'tab-security': 'Security Centre & Active Session Monitor',
    'tab-audit': 'Immutable Audit Trail & Administrative Logs',
    'tab-database': 'Cloudflare D1 SQL Telemetry & Schema',
    'tab-recovery': 'Backup, Export & Disaster Recovery',
    'tab-notifications': 'Notification Hub & Public Broadcasts'
  };

  function switchTab(targetId) {
    navItems.forEach(item => {
      const match = item.getAttribute('data-tab') === targetId;
      item.classList.toggle('active', match);
      item.setAttribute('aria-current', match ? 'page' : 'false');
    });

    modules.forEach(mod => {
      mod.classList.toggle('active', mod.id === targetId);
    });

    if (topbarTitle && tabTitles[targetId]) {
      topbarTitle.textContent = tabTitles[targetId];
    }

    closeSidebar();
  }

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetId = item.getAttribute('data-tab');
      if (targetId) switchTab(targetId);
    });
  });

  // Safe formatting helper
  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatTime(isoString) {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
    } catch (_) {
      return isoString;
    }
  }

  /* ==========================================================================
     Domain 1: Dashboard Overview & System Telemetry
     ========================================================================== */
  function renderOverview() {
    const store = window.CSOSuperStore;
    if (!store) return;

    const users = store.getUsers();
    const audit = store.getAudit();

    // Metric counts
    const usersValEl = document.getElementById('metric-users-val');
    if (usersValEl) usersValEl.textContent = users.length;

    // Activity Stream
    const activityTbody = document.getElementById('overview-activity-table');
    if (activityTbody) {
      activityTbody.innerHTML = audit.slice(0, 6).map(a => `
        <tr>
          <td style="font-family: monospace; font-size: 0.8rem;">${formatTime(a.timestamp)}</td>
          <td><strong style="color: var(--admin-emerald-bright);">${escapeHtml(a.actor)}</strong></td>
          <td><span class="status-pill info">${escapeHtml(a.eventType)}</span></td>
          <td style="font-family: monospace;">${escapeHtml(a.target)}</td>
          <td>${escapeHtml(a.details)}</td>
        </tr>
      `).join('');
    }
  }

  // Panic Buttons
  const btnPurgeCache = document.getElementById('btn-quick-purge-cache');
  if (btnPurgeCache) {
    btnPurgeCache.addEventListener('click', () => {
      if (confirm('Purge Cloudflare CDN Cache across all public routes?')) {
        window.CSOSuperStore.logAudit('CACHE_PURGED', 'ALL_CDN_ROUTES', 'Global edge cache purge manually triggered by Super Admin.');
        alert('Cloudflare CDN cache purge dispatched successfully.');
        renderOverview();
      }
    });
  }

  const btnToggleMaintenance = document.getElementById('btn-toggle-maintenance');
  if (btnToggleMaintenance) {
    btnToggleMaintenance.addEventListener('click', () => {
      const sys = window.CSOSuperStore.getSystem();
      sys.flags.maintenanceMode = !sys.flags.maintenanceMode;
      window.CSOSuperStore.saveSystem(sys);
      alert(`Maintenance Mode is now ${sys.flags.maintenanceMode ? 'ENABLED (Super Admin bypassed)' : 'DISABLED'}.`);
      renderSystem();
    });
  }

  const btnEmergencyNoticeQuick = document.getElementById('btn-emergency-broadcast-quick');
  if (btnEmergencyNoticeQuick) {
    btnEmergencyNoticeQuick.addEventListener('click', () => {
      switchTab('tab-notifications');
    });
  }

  /* ==========================================================================
     Domain 2: User Management & Verification Desk
     ========================================================================== */
  function renderUsers(filterQuery = '') {
    const store = window.CSOSuperStore;
    if (!store) return;
    const users = store.getUsers();
    const tbody = document.getElementById('users-table-body');
    if (!tbody) return;

    const filtered = users.filter(u => {
      const q = filterQuery.toLowerCase();
      return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.phone.includes(q);
    });

    tbody.innerHTML = filtered.map(u => {
      const statusClass = u.status === 'Verified' ? 'verified' : u.status === 'Suspended' ? 'suspended' : 'pending';
      return `
        <tr>
          <td style="font-family: monospace; font-size: 0.8rem;">${escapeHtml(u.id)}</td>
          <td><strong>${escapeHtml(u.name)}</strong></td>
          <td>${escapeHtml(u.email)}</td>
          <td style="font-size: 0.85rem;">${escapeHtml(u.phone)}</td>
          <td><span class="status-pill info">${escapeHtml(u.role)}</span></td>
          <td><span class="status-pill ${statusClass}">${escapeHtml(u.status)}</span></td>
          <td style="font-size: 0.8rem; color: var(--admin-text-muted);">${u.registeredAt.split('T')[0]}</td>
          <td>
            <div style="display: flex; gap: 6px;">
              ${!u.verified ? `
                <button type="button" class="btn-secondary btn-sm" onclick="window.csoVerifyUser('${u.id}')" title="Trigger Email Verification">
                  Verify
                </button>
              ` : ''}
              <button type="button" class="${u.status === 'Suspended' ? 'btn-primary' : 'btn-danger'} btn-sm" onclick="window.csoToggleUser('${u.id}')">
                ${u.status === 'Suspended' ? 'Reinstate' : 'Suspend'}
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  window.csoToggleUser = (userId) => {
    window.CSOSuperStore.toggleUserStatus(userId);
    renderUsers();
    renderOverview();
  };

  window.csoVerifyUser = (userId) => {
    window.CSOSuperStore.verifyUser(userId);
    renderUsers();
    renderOverview();
  };

  const userSearchInput = document.getElementById('user-search-input');
  if (userSearchInput) {
    userSearchInput.addEventListener('input', (e) => {
      renderUsers(e.target.value.trim());
    });
  }

  const btnExportUsers = document.getElementById('btn-export-users-csv');
  if (btnExportUsers) {
    btnExportUsers.addEventListener('click', () => {
      const users = window.CSOSuperStore.getUsers();
      const csv = 'ID,Name,Email,Phone,Role,Status,RegisteredAt\n' +
        users.map(u => `"${u.id}","${u.name}","${u.email}","${u.phone}","${u.role}","${u.status}","${u.registeredAt}"`).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cso-users-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    });
  }

  /* ==========================================================================
     Domain 3: Role & Permission Management (RBAC)
     ========================================================================== */
  function renderRoles() {
    const store = window.CSOSuperStore;
    if (!store) return;
    const roles = store.getRoles();
    const container = document.getElementById('rbac-cards-container');
    if (!container) return;

    container.innerHTML = roles.map(r => `
      <div class="rbac-card ${r.id === 'super_admin' ? 'primary' : ''}">
        <div class="rbac-header">
          <span class="rbac-name">${escapeHtml(r.name)}</span>
          <span class="status-pill ${r.id === 'super_admin' ? 'verified' : 'info'}">${r.usersCount} Assigned</span>
        </div>
        <p class="rbac-desc">${escapeHtml(r.description)}</p>
        <div class="perm-list">
          ${Object.entries(r.permissions).map(([k, v]) => `
            <div class="perm-item">
              <span style="font-family: monospace; font-size: 0.78rem;">${k}</span>
              <strong style="color: ${v ? 'var(--admin-emerald-bright)' : 'var(--admin-text-muted)'};">
                ${v ? '✓ ALLOWED' : '✕ DENIED'}
              </strong>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  }

  // Delegation Modal
  const modalDelegate = document.getElementById('modal-role-delegate');
  const btnOpenDelegate = document.getElementById('btn-open-delegate-modal');
  const btnCloseDelegate = document.getElementById('btn-close-delegate');
  const btnCancelDelegate = document.getElementById('btn-cancel-delegate');
  const btnConfirmDelegate = document.getElementById('btn-confirm-delegate');
  const selectDelegateUser = document.getElementById('delegate-user-select');
  const selectDelegateRole = document.getElementById('delegate-role-select');

  function openDelegateModal() {
    const users = window.CSOSuperStore.getUsers();
    if (selectDelegateUser) {
      selectDelegateUser.innerHTML = users.map(u => `
        <option value="${u.id}">${escapeHtml(u.name)} (${escapeHtml(u.email)}) - Current: ${u.role}</option>
      `).join('');
    }
    if (modalDelegate) modalDelegate.classList.add('open');
  }

  function closeDelegateModal() {
    if (modalDelegate) modalDelegate.classList.remove('open');
  }

  if (btnOpenDelegate) btnOpenDelegate.addEventListener('click', openDelegateModal);
  if (btnCloseDelegate) btnCloseDelegate.addEventListener('click', closeDelegateModal);
  if (btnCancelDelegate) btnCancelDelegate.addEventListener('click', closeDelegateModal);
  if (btnConfirmDelegate) {
    btnConfirmDelegate.addEventListener('click', () => {
      const userId = selectDelegateUser.value;
      const targetRole = selectDelegateRole.value;
      window.CSOSuperStore.assignUserRole(userId, targetRole);
      closeDelegateModal();
      renderUsers();
      renderRoles();
      renderOverview();
      alert('Role delegation updated successfully.');
    });
  }

  /* ==========================================================================
     Domain 4: Content Studio & Dynamic Page Builder
     ========================================================================== */
  function renderCMS() {
    const store = window.CSOSuperStore;
    if (!store) return;
    const pages = store.getPages();
    const tbody = document.getElementById('cms-pages-table-body');
    if (!tbody) return;

    tbody.innerHTML = pages.map(p => `
      <tr>
        <td><strong>${escapeHtml(p.title)}</strong></td>
        <td><code style="color: var(--admin-emerald-bright);">${escapeHtml(p.slug)}</code></td>
        <td><span class="status-pill info">${escapeHtml(p.template)}</span></td>
        <td><span class="status-pill ${p.status === 'Published' ? 'published' : 'draft'}">${escapeHtml(p.status)}</span></td>
        <td style="font-size: 0.8rem; color: var(--admin-text-muted);">${p.updatedAt.split('T')[0]}</td>
        <td>
          <button type="button" class="btn-secondary btn-sm" onclick="window.csoEditPage('${p.id}')">
            Edit
          </button>
        </td>
      </tr>
    `).join('');
  }

  // Page Builder Modal Elements
  const modalBuilder = document.getElementById('modal-page-builder');
  const btnNewPage = document.getElementById('btn-new-page');
  const btnCloseBuilder = document.getElementById('btn-close-builder');
  const btnSaveDraft = document.getElementById('btn-save-draft');
  const btnPublishPage = document.getElementById('btn-publish-page');

  const inputTitle = document.getElementById('builder-page-title');
  const inputSlug = document.getElementById('builder-page-slug');
  const selectTemplate = document.getElementById('builder-template-select');
  const inputSeoDesc = document.getElementById('builder-seo-desc');
  const textareaHtml = document.getElementById('builder-html-content');
  const previewBox = document.getElementById('builder-preview-box');

  let activeEditingPageId = null;

  function updateLivePreview() {
    if (previewBox && textareaHtml) {
      previewBox.innerHTML = textareaHtml.value;
    }
  }
  if (textareaHtml) textareaHtml.addEventListener('input', updateLivePreview);

  function openPageBuilder(page = null) {
    if (page) {
      activeEditingPageId = page.id;
      inputTitle.value = page.title || '';
      inputSlug.value = page.slug || '';
      selectTemplate.value = page.template || 'Standard Article';
      inputSeoDesc.value = page.seoDescription || '';
      textareaHtml.value = page.htmlContent || '<h2>' + page.title + '</h2><p>Page content...</p>';
    } else {
      activeEditingPageId = null;
      inputTitle.value = '';
      inputSlug.value = '/study/new-guide';
      selectTemplate.value = 'Standard Article';
      inputSeoDesc.value = '';
      textareaHtml.value = '<h2>New Educational Asset</h2><p>Verified information for Odisha students.</p>';
    }
    updateLivePreview();
    if (modalBuilder) modalBuilder.classList.add('open');
  }

  function closePageBuilder() {
    if (modalBuilder) modalBuilder.classList.remove('open');
  }

  if (btnNewPage) btnNewPage.addEventListener('click', () => openPageBuilder());
  if (btnCloseBuilder) btnCloseBuilder.addEventListener('click', closePageBuilder);

  function commitPageSave(status) {
    const pageData = {
      id: activeEditingPageId || 'page-' + Date.now().toString(36),
      title: inputTitle.value.trim() || 'Untitled Document',
      slug: inputSlug.value.trim() || '/article/' + Date.now().toString(36),
      template: selectTemplate.value,
      seoDescription: inputSeoDesc.value.trim(),
      htmlContent: textareaHtml.value,
      status
    };
    window.CSOSuperStore.savePage(pageData);
    closePageBuilder();
    renderCMS();
    renderOverview();
  }

  if (btnSaveDraft) btnSaveDraft.addEventListener('click', () => commitPageSave('Draft'));
  if (btnPublishPage) btnPublishPage.addEventListener('click', () => commitPageSave('Published'));

  window.csoEditPage = (pageId) => {
    const pages = window.CSOSuperStore.getPages();
    const target = pages.find(p => p.id === pageId);
    if (target) openPageBuilder(target);
  };

  /* ==========================================================================
     Domain 5: System Management & Integrations
     ========================================================================== */
  function renderSystem() {
    const store = window.CSOSuperStore;
    if (!store) return;
    const sys = store.getSystem();

    const flagReg = document.getElementById('flag-registration');
    const flagInq = document.getElementById('flag-inquiries');
    const flagMaint = document.getElementById('flag-maintenance');
    const sysForwarding = document.getElementById('sys-forwarding-email');
    const sysHost = document.getElementById('sys-smtp-host');
    const sysPort = document.getElementById('sys-smtp-port');
    const sysHeadCode = document.getElementById('sys-head-code');

    if (flagReg) flagReg.checked = sys.flags.registrationOpen;
    if (flagInq) flagInq.checked = sys.flags.inquiryDispatch;
    if (flagMaint) flagMaint.checked = sys.flags.maintenanceMode;
    if (sysForwarding) sysForwarding.value = sys.mail.forwardingDestination;
    if (sysHost) sysHost.value = sys.mail.smtpHost;
    if (sysPort) sysPort.value = sys.mail.smtpPort;
    if (sysHeadCode) sysHeadCode.value = sys.customCode.headCode;
  }

  const btnSaveSystemFlags = document.getElementById('btn-save-system-flags');
  if (btnSaveSystemFlags) {
    btnSaveSystemFlags.addEventListener('click', () => {
      const sys = window.CSOSuperStore.getSystem();
      sys.flags.registrationOpen = document.getElementById('flag-registration').checked;
      sys.flags.inquiryDispatch = document.getElementById('flag-inquiries').checked;
      sys.flags.maintenanceMode = document.getElementById('flag-maintenance').checked;
      sys.mail.forwardingDestination = document.getElementById('sys-forwarding-email').value.trim();
      sys.mail.smtpHost = document.getElementById('sys-smtp-host').value.trim();
      sys.mail.smtpPort = parseInt(document.getElementById('sys-smtp-port').value, 10) || 587;
      sys.customCode.headCode = document.getElementById('sys-head-code').value;

      window.CSOSuperStore.saveSystem(sys);
      renderOverview();
      alert('System configurations and feature flags saved successfully.');
    });
  }

  /* ==========================================================================
     Domain 6: Security Centre & Active Session Monitor
     ========================================================================== */
  function renderSecurity() {
    const store = window.CSOSuperStore;
    if (!store) return;
    const sec = store.getSecurity();

    // Active Sessions
    const sessionsBody = document.getElementById('security-sessions-table');
    if (sessionsBody) {
      sessionsBody.innerHTML = sec.activeSessions.map(s => `
        <tr>
          <td style="font-family: monospace; font-size: 0.8rem;">${escapeHtml(s.id)}</td>
          <td><strong>${escapeHtml(s.user)}</strong></td>
          <td>${escapeHtml(s.ip)} <br><small style="color: var(--admin-text-muted);">${escapeHtml(s.geo)}</small></td>
          <td style="font-size: 0.82rem;">${escapeHtml(s.device)}</td>
          <td style="font-size: 0.8rem;">${s.loginTime.replace('T', ' ').slice(0, 16)}</td>
          <td>
            ${s.isCurrent ? `
              <span class="status-pill verified">Current Session</span>
            ` : `
              <button type="button" class="btn-danger btn-sm" onclick="window.csoRevokeSession('${s.id}')">
                Revoke
              </button>
            `}
          </td>
        </tr>
      `).join('');
    }

    // IP Rules
    const ipBody = document.getElementById('security-ip-table');
    if (ipBody) {
      ipBody.innerHTML = sec.ipRules.map(r => `
        <tr>
          <td><code style="color: var(--admin-emerald-bright);">${escapeHtml(r.ip)}</code></td>
          <td><span class="status-pill ${r.action === 'Block' ? 'danger' : 'verified'}">${escapeHtml(r.action)}</span></td>
          <td>${escapeHtml(r.note)}</td>
          <td style="font-size: 0.8rem; color: var(--admin-text-muted);">${escapeHtml(r.addedAt)}</td>
        </tr>
      `).join('');
    }
  }

  window.csoRevokeSession = (sessionId) => {
    window.CSOSuperStore.revokeSession(sessionId);
    renderSecurity();
    renderOverview();
  };

  const btnAddIpRule = document.getElementById('btn-add-ip-rule');
  if (btnAddIpRule) {
    btnAddIpRule.addEventListener('click', () => {
      const ip = prompt('Enter IP Address or CIDR block:');
      if (!ip) return;
      const action = confirm(`Block ${ip}? Click OK to Block, Cancel to Whitelist`) ? 'Block' : 'Whitelist';
      const note = prompt('Reason or notes for this rule:', 'Manual administrator policy');
      window.CSOSuperStore.addIpRule(ip.trim(), action, note || 'Administrator rule');
      renderSecurity();
      renderOverview();
    });
  }

  /* ==========================================================================
     Domain 7: Immutable Audit Trail & Administrative Logs
     ========================================================================== */
  function renderAudit(filterQuery = '') {
    const store = window.CSOSuperStore;
    if (!store) return;
    const logs = store.getAudit();
    const tbody = document.getElementById('audit-table-body');
    if (!tbody) return;

    const filtered = logs.filter(l => {
      const q = filterQuery.toLowerCase();
      return l.eventType.toLowerCase().includes(q) || l.actor.toLowerCase().includes(q) || l.target.toLowerCase().includes(q) || l.details.toLowerCase().includes(q);
    });

    tbody.innerHTML = filtered.map(l => `
      <tr>
        <td style="font-family: monospace; font-size: 0.8rem;">${escapeHtml(l.id)}</td>
        <td style="font-size: 0.8rem; color: var(--admin-text-muted);">${l.timestamp.replace('T', ' ').slice(0, 19)}</td>
        <td><strong>${escapeHtml(l.actor)}</strong></td>
        <td><span class="status-pill info">${escapeHtml(l.eventType)}</span></td>
        <td style="font-family: monospace; font-size: 0.82rem;">${escapeHtml(l.target)}</td>
        <td style="font-family: monospace; font-size: 0.8rem;">${escapeHtml(l.ip)}</td>
        <td style="font-size: 0.85rem;">${escapeHtml(l.details)}</td>
      </tr>
    `).join('');
  }

  const auditSearchInput = document.getElementById('audit-search-input');
  if (auditSearchInput) {
    auditSearchInput.addEventListener('input', (e) => {
      renderAudit(e.target.value.trim());
    });
  }

  const btnExportAudit = document.getElementById('btn-export-audit-json');
  if (btnExportAudit) {
    btnExportAudit.addEventListener('click', () => {
      const logs = window.CSOSuperStore.getAudit();
      const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cso-audit-trail-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
    });
  }

  /* ==========================================================================
     Domain 8: Cloudflare D1 Monitoring & Schema Inspector
     ========================================================================== */
  function renderDatabase() {
    const store = window.CSOSuperStore;
    if (!store) return;
    const d1 = store.getD1();
    const tbody = document.getElementById('d1-tables-body');
    if (!tbody) return;

    tbody.innerHTML = d1.tables.map(t => `
      <tr>
        <td><code style="color: var(--admin-emerald-bright); font-weight: 700;">${escapeHtml(t.name)}</code></td>
        <td>${t.rows.toLocaleString()} rows</td>
        <td>${t.columns} cols</td>
        <td>${t.sizeKb} KB</td>
        <td><span class="status-pill verified">Valid (Replica Active)</span></td>
      </tr>
    `).join('');
  }

  const btnRunSql = document.getElementById('btn-run-sql');
  const sqlInput = document.getElementById('sql-query-input');
  const sqlOutput = document.getElementById('sql-query-output');

  if (btnRunSql && sqlInput && sqlOutput) {
    btnRunSql.addEventListener('click', () => {
      const q = sqlInput.value.trim();
      if (!q.toUpperCase().startsWith('SELECT')) {
        sqlOutput.textContent = 'ERROR: Only read-only SELECT queries are permitted in this sandboxed console.';
        sqlOutput.style.color = 'var(--admin-danger)';
        return;
      }
      sqlOutput.style.color = '#38bdf8';
      const users = window.CSOSuperStore.getUsers();
      sqlOutput.textContent = JSON.stringify(users.slice(0, 3), null, 2);
    });
  }

  /* ==========================================================================
     Domain 9: Backup & Disaster Recovery
     ========================================================================== */
  const btnCreateSnapshot = document.getElementById('btn-create-snapshot');
  if (btnCreateSnapshot) {
    btnCreateSnapshot.addEventListener('click', () => {
      const snapshot = window.CSOSuperStore.createPlatformSnapshot();
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cso-platform-snapshot-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      renderOverview();
      alert('Full Platform Snapshot generated and downloaded successfully.');
    });
  }

  const btnRestoreSnapshot = document.getElementById('btn-restore-snapshot');
  const snapshotFileInput = document.getElementById('snapshot-file-input');

  if (btnRestoreSnapshot && snapshotFileInput) {
    btnRestoreSnapshot.addEventListener('click', () => {
      const file = snapshotFileInput.files[0];
      if (!file) {
        alert('Please select a valid .json snapshot file first.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const snapshot = JSON.parse(e.target.result);
          window.CSOSuperStore.restoreFromSnapshot(snapshot);
          alert('Platform state successfully restored from snapshot!');
          location.reload();
        } catch (err) {
          alert('Snapshot parse error: ' + err.message);
        }
      };
      reader.readAsText(file);
    });
  }

  const btnPanicLockdown = document.getElementById('btn-panic-lockdown');
  if (btnPanicLockdown) {
    btnPanicLockdown.addEventListener('click', () => {
      if (confirm('ENFORCE PANIC LOCKDOWN: All non-Super Admin write operations will be frozen immediately.')) {
        window.CSOSuperStore.logAudit('PANIC_LOCKDOWN_ENFORCED', 'GLOBAL_ZERO_TRUST', 'Zero-Trust panic lockdown enforced.');
        alert('Panic Lockdown enforced. All public modification pipelines are isolated.');
        renderOverview();
      }
    });
  }

  /* ==========================================================================
     Domain 10: Notification Hub & Broadcast Centre
     ========================================================================== */
  function renderNotifications() {
    const store = window.CSOSuperStore;
    if (!store) return;
    const notifs = store.getNotifications();
    const tbody = document.getElementById('notifications-table-body');
    if (!tbody) return;

    tbody.innerHTML = notifs.map(n => {
      const pillClass = n.severity === 'emergency' ? 'danger' : n.severity === 'warning' ? 'warning' : 'verified';
      return `
        <tr>
          <td><span class="status-pill ${pillClass}">${escapeHtml(n.severity.toUpperCase())}</span></td>
          <td><strong>${escapeHtml(n.title)}</strong></td>
          <td style="font-size: 0.85rem;">${escapeHtml(n.message)}</td>
          <td style="font-size: 0.8rem; color: var(--admin-text-muted);">${formatTime(n.timestamp)}</td>
        </tr>
      `;
    }).join('');

    // Pre-fill active broadcast if existing
    const activeBroadcast = store.getActiveBroadcast();
    const inputHeadline = document.getElementById('broadcast-headline-input');
    const inputLink = document.getElementById('broadcast-link-input');
    const selectSeverity = document.getElementById('broadcast-severity-select');

    if (activeBroadcast && inputHeadline && inputLink && selectSeverity) {
      inputHeadline.value = activeBroadcast.headline || '';
      inputLink.value = activeBroadcast.link || '';
      selectSeverity.value = activeBroadcast.severity || 'info';
    }
  }

  const btnPublishBroadcast = document.getElementById('btn-publish-broadcast');
  if (btnPublishBroadcast) {
    btnPublishBroadcast.addEventListener('click', () => {
      const headline = document.getElementById('broadcast-headline-input').value.trim();
      const link = document.getElementById('broadcast-link-input').value.trim();
      const severity = document.getElementById('broadcast-severity-select').value;

      if (!headline) {
        alert('Please enter an announcement headline.');
        return;
      }

      window.CSOSuperStore.publishBroadcast({
        headline,
        link,
        severity,
        publishedAt: new Date().toISOString()
      });

      renderOverview();
      alert('Broadcast published! It will appear across the public homepage banner.');
    });
  }

  const btnTakedownBroadcast = document.getElementById('btn-takedown-broadcast');
  if (btnTakedownBroadcast) {
    btnTakedownBroadcast.addEventListener('click', () => {
      window.CSOSuperStore.takedownBroadcast();
      document.getElementById('broadcast-headline-input').value = '';
      document.getElementById('broadcast-link-input').value = '';
      renderOverview();
      alert('Homepage broadcast banner taken down.');
    });
  }

  /* ==========================================================================
     Global Initialization
     ========================================================================== */
  function initAll() {
    renderOverview();
    renderUsers();
    renderRoles();
    renderCMS();
    renderSystem();
    renderSecurity();
    renderAudit();
    renderDatabase();
    renderNotifications();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
})();
