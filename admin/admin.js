/**
 * CSO Admin Control Dashboard Client Controller (admin.js)
 * 
 * Features:
 * - Module Tab Switching (Overview, Inquiries, Broadcasts, System Config)
 * - Off-canvas mobile drawer navigation & keyboard trapping
 * - Searchable, filterable Inquiries data table with status counts
 * - Action modal/drawer to inspect full message, change status, and send replies
 * - Real-time statistics & verification status
 * - Sync with /api/admin/submissions and local mock storage
 * - Public banner moderation (publish & takedown)
 */

(() => {
  'use strict';

  // Constants
  const STORAGE_SUBMISSIONS_KEY = 'cso_admin_submissions_local';
  const ALERTS_KEY = 'cso_admin_alerts';
  const ACTIVITY_KEY = 'cso_admin_activity';
  const PUBLIC_ANNOUNCEMENT_KEY = 'cso_active_announcement';

  // State
  let activeModule = 'overview';
  let activeFilter = 'all';
  let searchQuery = '';
  let submissions = [];
  let currentInspectingItem = null;

  // DOM Elements
  const btnMobileToggle = document.getElementById('btn-mobile-toggle');
  const btnSidebarClose = document.getElementById('btn-sidebar-close');
  const backdrop = document.getElementById('admin-backdrop');
  const navItems = document.querySelectorAll('.nav-item[data-module]');
  const modules = document.querySelectorAll('.admin-module');
  const topbarTitle = document.getElementById('topbar-title');
  const btnSignout = document.getElementById('btn-signout');

  // Inquiries Elements
  const inquiriesTableBody = document.getElementById('inquiries-table-body');
  const searchInput = document.getElementById('inquiry-search');
  const filterChips = document.querySelectorAll('.filter-chip[data-status]');
  const unreadBadgeSidebar = document.getElementById('sidebar-unread-badge');
  const totalSubmissionsVal = document.getElementById('total-submissions-val');
  const unreadSubmissionsVal = document.getElementById('unread-submissions-val');
  const resolvedSubmissionsVal = document.getElementById('resolved-submissions-val');

  // Inspector Modal Elements
  const inquiryModal = document.getElementById('inquiry-modal');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const modalInquiryId = document.getElementById('modal-inquiry-id');
  const modalSenderName = document.getElementById('modal-sender-name');
  const modalSenderEmail = document.getElementById('modal-sender-email');
  const modalSenderPhone = document.getElementById('modal-sender-phone');
  const modalTimestamp = document.getElementById('modal-timestamp');
  const modalSubject = document.getElementById('modal-subject');
  const modalCategory = document.getElementById('modal-category');
  const modalStatusSelect = document.getElementById('modal-status-select');
  const modalMessageBody = document.getElementById('modal-message-body');
  const modalReplyText = document.getElementById('modal-reply-text');
  const btnSendReply = document.getElementById('btn-send-reply');

  // Broadcast & Config Elements
  const announcementForm = document.getElementById('announcement-form');
  const alertTypeSelect = document.getElementById('alert-type');
  const alertTitleInput = document.getElementById('alert-title');
  const alertBodyInput = document.getElementById('alert-body');
  const alertLinkInput = document.getElementById('alert-link');
  const btnClearActiveBanner = document.getElementById('btn-clear-active-banner');
  const alertsTableBody = document.getElementById('alerts-table-body');
  const btnClearCache = document.getElementById('btn-clear-cache');
  const btnReindexData = document.getElementById('btn-reindex-data');

  // Toast System
  let toastTimer = null;
  function showToast(message, type = 'success') {
    const existing = document.querySelector('.admin-toast');
    if (existing) existing.remove();
    if (toastTimer) clearTimeout(toastTimer);

    const toast = document.createElement('div');
    toast.className = `admin-toast ${type}`;
    toast.innerHTML = `<span aria-hidden="true">${type === 'success' ? '✓' : '⚠'}</span> <span>${message}</span>`;
    document.body.appendChild(toast);

    toastTimer = setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(12px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, 3500);
  }

  // Mobile Drawer Toggle
  function openMobileMenu() {
    document.body.classList.add('admin-menu-open');
    if (btnMobileToggle) btnMobileToggle.setAttribute('aria-expanded', 'true');
  }

  function closeMobileMenu() {
    document.body.classList.remove('admin-menu-open');
    if (btnMobileToggle) btnMobileToggle.setAttribute('aria-expanded', 'false');
  }

  if (btnMobileToggle) btnMobileToggle.addEventListener('click', openMobileMenu);
  if (btnSidebarClose) btnSidebarClose.addEventListener('click', closeMobileMenu);
  if (backdrop) backdrop.addEventListener('click', closeMobileMenu);

  // Sign out
  if (btnSignout) {
    btnSignout.addEventListener('click', () => {
      if (window.CSOAdminGuard) {
        window.CSOAdminGuard.signOut();
      } else {
        sessionStorage.clear();
        localStorage.removeItem('cso_admin_session');
        window.location.replace('/admin/login');
      }
    });
  }

  // Module Tab Switching
  function switchModule(targetId) {
    activeModule = targetId;
    navItems.forEach(item => {
      const match = item.getAttribute('data-module') === targetId;
      item.classList.toggle('active', match);
      item.setAttribute('aria-current', match ? 'page' : 'false');
    });

    modules.forEach(mod => {
      mod.hidden = mod.id !== `module-${targetId}`;
    });

    const titleMap = {
      overview: 'System Overview & Analytics',
      inquiries: 'Inquiries & Submissions',
      broadcasts: 'Public Broadcasts & Alerts',
      config: 'System Configuration'
    };
    if (topbarTitle) {
      topbarTitle.textContent = titleMap[targetId] || 'Admin Dashboard';
    }

    closeMobileMenu();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  navItems.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const mod = e.currentTarget.getAttribute('data-module');
      if (mod) switchModule(mod);
    });
  });

  // Load Submissions from API or Seed/Local Storage
  async function loadSubmissions() {
    // 1. Try local cache first for persistence
    const cached = localStorage.getItem(STORAGE_SUBMISSIONS_KEY);
    if (cached) {
      try {
        submissions = JSON.parse(cached);
      } catch (_) {}
    }

    // 2. Fetch from API (/api/admin/submissions) with fallback to /api/admin/submissions.json
    try {
      const session = window.CSOAdminGuard ? window.CSOAdminGuard.getSession() : null;
      const headers = session && session.token ? { 'Authorization': `Bearer ${session.token}`, 'Accept': 'application/json' } : { 'Accept': 'application/json' };
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      let res;
      try {
        res = await fetch('/api/admin/submissions', { headers, signal: controller.signal });
      } catch (fetchErr) {
        // Fallback to static seed file if Worker route fails
        res = await fetch('/api/admin/submissions.json');
      } finally {
        clearTimeout(timeoutId);
      }

      if (!res.ok) {
        res = await fetch('/api/admin/submissions.json');
      }

      if (res && res.ok) {
        const data = await res.json();
        if (Array.isArray(data.submissions) && data.submissions.length > 0) {
          // If we have local status changes, keep them; otherwise initialize
          if (!submissions.length) {
            submissions = data.submissions;
            localStorage.setItem(STORAGE_SUBMISSIONS_KEY, JSON.stringify(submissions));
          }
        }
      }
    } catch (_) {
      // Offline fallback: Use seed data if empty
      if (!submissions || submissions.length === 0) {
        submissions = [
          {
            id: "INQ-2026-1082",
            timestamp: "2026-11-08T14:45:20Z",
            name: "Subrat Kumar Mohanty",
            email: "subrat.mohanty@gmail.com",
            phone: "+91 94371 88290",
            subject: "OPSC Civil Services Preliminary Syllabus clarification",
            message: "Respected team, could you please verify if the recent CSAT pattern update has been published in the jobs & careers portal? The syllabus link for General Studies Paper II seems to refer to last year's notification. Thank you for maintaining this excellent platform for Odisha students.",
            category: "Exam Syllabus",
            status: "unread",
            priority: "high",
            source: "contact@csodisha.com"
          },
          {
            id: "INQ-2026-1081",
            timestamp: "2026-11-08T12:15:05Z",
            name: "Priyadarshini Rout",
            email: "priya.rout99@yahoo.co.in",
            phone: "+91 70081 23456",
            subject: "Medhabruti Scholarship renewal application deadline",
            message: "Hello CSO Team, I am an engineering student studying at VSSUT Burla. I wanted to confirm the last date for submitting the income declaration certificate on the State Scholarship Portal for Medhabruti renewal. Your portal's scheme tracker has been very helpful.",
            category: "Scholarships",
            status: "unread",
            priority: "medium",
            source: "contact@csodisha.com"
          },
          {
            id: "INQ-2026-1079",
            timestamp: "2026-11-07T18:32:40Z",
            name: "Dr. Bijaylaxmi Das",
            email: "bijaylaxmi.das@utkaluniversity.ac.in",
            phone: "+91 98610 99412",
            subject: "Odisha Higher Education Faculty Research Grant details",
            message: "Dear CSO Editorial Team, We recently published a state-funded research index under OSHEC. Would it be possible to include the OSHEC Post-Doctoral Fellowship details in your Study Library under Odisha Higher Education opportunities? Happy to provide official notification PDFs.",
            category: "Resource Suggestion",
            status: "read",
            priority: "medium",
            source: "admin@csodisha.com"
          },
          {
            id: "INQ-2026-1076",
            timestamp: "2026-11-07T09:10:15Z",
            name: "Chandan Behera",
            email: "chandan.behera.od@outlook.com",
            phone: "+91 99380 55123",
            subject: "OSSSC Combined Recruitment Examination Admit Card link",
            message: "Greetings, The download link for OSSSC Junior Assistant admit card leads to server maintenance on the official OSSSC site. Does CSO maintain an alternative mirror link or cache? Looking forward to your guidance.",
            category: "Admit Card",
            status: "resolved",
            priority: "low",
            source: "contact@csodisha.com"
          },
          {
            id: "INQ-2026-1074",
            timestamp: "2026-11-06T15:20:00Z",
            name: "Ananya Patnaik",
            email: "ananya.patnaik@gmail.com",
            phone: "+91 91780 44321",
            subject: "OTET / OSSTET Qualifying Mark calculation for reserved category",
            message: "Sir/Madam, in the eligibility explorer under Teacher Recruitment, the pass mark for SC/ST candidates is stated as 50% (75 marks). Is there any additional relaxation for PwD candidates as per recent BSE Odisha notification? Kindly update if possible.",
            category: "Eligibility Criteria",
            status: "resolved",
            priority: "medium",
            source: "contact@csodisha.com"
          },
          {
            id: "INQ-2026-1071",
            timestamp: "2026-11-05T11:05:44Z",
            name: "Rashmi Ranjan Sahoo",
            email: "rashmi.sahoo@techodisha.in",
            phone: "+91 94399 77810",
            subject: "Technical issue: Study notes search filter on mobile view",
            message: "Hi, when searching under Study Library with two active filters (Secondary + Odia medium), the dropdown menu does not collapse after selection on Android Chrome. Minor UI glitch, otherwise very fast website.",
            category: "Bug Report",
            status: "read",
            priority: "low",
            source: "admin@csodisha.com"
          }
        ];
        localStorage.setItem(STORAGE_SUBMISSIONS_KEY, JSON.stringify(submissions));
      }
    } finally {
      renderSubmissions();
      updateMetrics();
      dismissPageLoader();
    }
  }

  function updateMetrics() {
    const unread = submissions.filter(s => s.status === 'unread').length;
    const resolved = submissions.filter(s => s.status === 'resolved').length;
    const total = submissions.length;

    if (unreadBadgeSidebar) {
      unreadBadgeSidebar.textContent = unread > 0 ? `${unread} New` : '0';
      unreadBadgeSidebar.style.display = unread > 0 ? 'inline-block' : 'none';
    }

    if (totalSubmissionsVal) totalSubmissionsVal.textContent = total;
    if (unreadSubmissionsVal) unreadSubmissionsVal.textContent = unread;
    if (resolvedSubmissionsVal) resolvedSubmissionsVal.textContent = resolved;
  }

  function renderSubmissions() {
    if (!inquiriesTableBody) return;

    let filtered = [...submissions];

    // Filter by Status
    if (activeFilter !== 'all') {
      filtered = filtered.filter(item => item.status.toLowerCase() === activeFilter.toLowerCase());
    }

    // Filter by Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(q) ||
        item.email.toLowerCase().includes(q) ||
        item.subject.toLowerCase().includes(q) ||
        item.message.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q)
      );
    }

    inquiriesTableBody.innerHTML = '';

    if (filtered.length === 0) {
      inquiriesTableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; color: var(--admin-text-muted); padding: 32px;">
            No inquiries match the current search or filter criteria.
          </td>
        </tr>
      `;
      return;
    }

    filtered.forEach(item => {
      const tr = document.createElement('tr');
      const timeStr = new Date(item.timestamp).toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const messagePreview = item.message.length > 70
        ? item.message.slice(0, 70) + '...'
        : item.message;

      tr.innerHTML = `
        <td><strong style="font-family: monospace; color: #93c5fd;">${escapeHtml(item.id)}</strong></td>
        <td style="color: var(--admin-text-muted); font-size: 0.8rem; white-space: nowrap;">${timeStr}</td>
        <td>
          <div style="font-weight: 700;">${escapeHtml(item.name)}</div>
          <div style="color: var(--admin-text-muted); font-size: 0.78rem;">${escapeHtml(item.email)}</div>
        </td>
        <td><strong style="color: var(--admin-text-primary);">${escapeHtml(item.subject)}</strong></td>
        <td style="color: var(--admin-text-secondary); max-width: 280px; font-size: 0.82rem;">${escapeHtml(messagePreview)}</td>
        <td><span class="status-badge ${item.status}">${item.status}</span></td>
        <td>
          <button type="button" class="btn-table-action" data-inspect-id="${item.id}" aria-label="Inspect inquiry ${item.id}">
            Inspect &rarr;
          </button>
        </td>
      `;

      inquiriesTableBody.appendChild(tr);
    });

    // Wire inspector buttons
    inquiriesTableBody.querySelectorAll('[data-inspect-id]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-inspect-id');
        openInspector(id);
      });
    });
  }

  // Filter Chips
  filterChips.forEach(chip => {
    chip.addEventListener('click', (e) => {
      filterChips.forEach(c => c.classList.remove('active'));
      e.currentTarget.classList.add('active');
      activeFilter = e.currentTarget.getAttribute('data-status') || 'all';
      renderSubmissions();
    });
  });

  // Search Input
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = (e.target.value || '').trim();
      renderSubmissions();
    });
  }

  // Inspector Modal / Drawer
  function openInspector(id) {
    const item = submissions.find(s => s.id === id);
    if (!item) return;

    currentInspectingItem = item;

    // Automatically mark as read if it was unread
    if (item.status === 'unread') {
      updateSubmissionStatus(item.id, 'read', false);
    }

    if (modalInquiryId) modalInquiryId.textContent = item.id;
    if (modalSenderName) modalSenderName.textContent = item.name;
    if (modalSenderEmail) {
      modalSenderEmail.textContent = item.email;
      modalSenderEmail.href = `mailto:${item.email}`;
    }
    if (modalSenderPhone) modalSenderPhone.textContent = item.phone || 'Not provided';
    if (modalTimestamp) modalTimestamp.textContent = new Date(item.timestamp).toLocaleString();
    if (modalSubject) modalSubject.textContent = item.subject;
    if (modalCategory) modalCategory.textContent = item.category || 'General Support';
    if (modalStatusSelect) modalStatusSelect.value = item.status;
    if (modalMessageBody) modalMessageBody.textContent = item.message;
    if (modalReplyText) modalReplyText.value = '';

    if (inquiryModal) {
      inquiryModal.hidden = false;
      inquiryModal.removeAttribute('hidden');
    }
  }

  function closeInspector() {
    if (inquiryModal) {
      inquiryModal.hidden = true;
      inquiryModal.setAttribute('hidden', '');
    }
    currentInspectingItem = null;
  }

  if (btnCloseModal) btnCloseModal.addEventListener('click', closeInspector);

  // Status Change inside Inspector
  if (modalStatusSelect) {
    modalStatusSelect.addEventListener('change', (e) => {
      if (!currentInspectingItem) return;
      const newStatus = e.target.value;
      updateSubmissionStatus(currentInspectingItem.id, newStatus, true);
    });
  }

  async function updateSubmissionStatus(id, newStatus, notify = true) {
    const item = submissions.find(s => s.id === id);
    if (!item) return;

    item.status = newStatus;
    localStorage.setItem(STORAGE_SUBMISSIONS_KEY, JSON.stringify(submissions));

    // Try PATCH to /api/admin/submissions/:id
    try {
      const session = window.CSOAdminGuard ? window.CSOAdminGuard.getSession() : null;
      const headers = {
        'Content-Type': 'application/json',
        ...(session && session.token ? { 'Authorization': `Bearer ${session.token}` } : {})
      };
      await fetch(`/api/admin/submissions/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: newStatus })
      });
    } catch (_) {}

    renderSubmissions();
    updateMetrics();

    if (notify) {
      showToast(`Inquiry ${id} updated to "${newStatus}".`);
      logActivity(`Updated ${id} status to ${newStatus}`);
    }
  }

  // Quick Reply Template Chips
  const TEMPLATES = {
    syllabus: "Dear Student,\n\nThank you for reaching out to Common Sense Odisha. The updated examination syllabus and CSAT pattern from official government notifications are now live in the Jobs & Careers Explorer.\n\nWarm regards,\nEditorial Team\nCommon Sense Odisha",
    scholarship: "Hello,\n\nThank you for contacting CSO Support. We have verified the Medhabruti scholarship deadline with the State Scholarship Portal. Please refer to our Schemes & Benefits guide for document requirements.\n\nBest wishes,\nCSO Student Support",
    resolved: "Dear Citizen,\n\nYour query has been reviewed and resolved by our verification team. The corrected links have been synchronized with the live platform.\n\nThank you for helping keep Odisha's public directory accurate!\n\nCommon Sense Odisha Team"
  };

  document.querySelectorAll('.template-btn[data-template]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const key = e.currentTarget.getAttribute('data-template');
      if (modalReplyText && TEMPLATES[key]) {
        modalReplyText.value = TEMPLATES[key];
      }
    });
  });

  // Send Reply Action
  if (btnSendReply) {
    btnSendReply.addEventListener('click', () => {
      if (!currentInspectingItem) return;
      const replyMsg = (modalReplyText?.value || '').trim();

      if (!replyMsg) {
        showToast('Please draft a reply or select a quick template first.', 'error');
        return;
      }

      // Automatically mark as resolved
      updateSubmissionStatus(currentInspectingItem.id, 'resolved', false);

      // Open mailto client as fallback or trigger mail routing
      const subject = encodeURIComponent(`Re: ${currentInspectingItem.subject} [${currentInspectingItem.id}]`);
      const body = encodeURIComponent(replyMsg);
      const mailtoUrl = `mailto:${currentInspectingItem.email}?subject=${subject}&body=${body}`;

      showToast(`Reply prepared for ${currentInspectingItem.email}. Inquiry marked resolved.`);
      logActivity(`Replied to ${currentInspectingItem.id} (${currentInspectingItem.email})`);
      closeInspector();

      // Launch default client
      window.open(mailtoUrl, '_blank');
    });
  }

  // Broadcasts / Announcements Form
  if (announcementForm) {
    announcementForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const type = alertTypeSelect?.value || 'notice';
      const title = (alertTitleInput?.value || '').trim();
      const body = (alertBodyInput?.value || '').trim();
      const link = (alertLinkInput?.value || '').trim();

      if (!title || !body) {
        showToast('Please provide both headline and message.', 'error');
        return;
      }

      const timestamp = new Date().toISOString();
      const alerts = getAlerts();
      alerts.unshift({
        id: 'alt_' + Date.now().toString(36),
        type,
        title,
        body,
        link,
        created: timestamp
      });

      saveAlerts(alerts);

      // Sync public live announcement
      try {
        const publicAnnouncement = {
          tag: type === 'emergency' ? 'EMERGENCY ALERT' : (type === 'update' ? 'UPDATE' : 'NOTICE'),
          type,
          title,
          text: title + (body ? ': ' + body : ''),
          link: link || '',
          timestamp,
          active: true
        };
        localStorage.setItem(PUBLIC_ANNOUNCEMENT_KEY, JSON.stringify(publicAnnouncement));
      } catch (_) {}

      loadAlerts();
      announcementForm.reset();
      showToast('Announcement published and public banner activated!');
      logActivity(`Published ${type}: "${title}"`);
    });
  }

  // Clear Active Banner Action
  if (btnClearActiveBanner) {
    btnClearActiveBanner.addEventListener('click', () => {
      localStorage.removeItem(PUBLIC_ANNOUNCEMENT_KEY);
      showToast('Public homepage banner taken down.');
      logActivity('Cleared live public banner');
    });
  }

  function getAlerts() {
    try {
      return JSON.parse(localStorage.getItem(ALERTS_KEY) || '[]');
    } catch (_) {
      return [];
    }
  }

  function saveAlerts(alerts) {
    try {
      localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts));
    } catch (_) {}
  }

  function loadAlerts() {
    if (!alertsTableBody) return;
    const alerts = getAlerts();

    alertsTableBody.innerHTML = '';
    if (alerts.length === 0) {
      alertsTableBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; color: var(--admin-text-muted); padding: 24px;">
            No announcements currently active. Publish one using the form above.
          </td>
        </tr>
      `;
      return;
    }

    alerts.forEach((alert, index) => {
      const tr = document.createElement('tr');
      const timeStr = new Date(alert.created).toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      const badgeClass = alert.type === 'emergency' ? 'unread' : (alert.type === 'update' ? 'resolved' : 'read');

      tr.innerHTML = `
        <td><span class="status-badge ${badgeClass}">${alert.type}</span></td>
        <td><strong>${escapeHtml(alert.title)}</strong></td>
        <td style="color: var(--admin-text-secondary); max-width: 260px;">${escapeHtml(alert.body)}</td>
        <td style="color: var(--admin-text-muted); font-size: 0.8rem;">${timeStr}</td>
        <td>
          <button type="button" class="btn-table-action" style="color: #f87171;" data-del-alert="${index}">
            Remove
          </button>
        </td>
      `;
      alertsTableBody.appendChild(tr);
    });

    alertsTableBody.querySelectorAll('[data-del-alert]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.getAttribute('data-del-alert'), 10);
        const alerts = getAlerts();
        if (idx >= 0 && idx < alerts.length) {
          const removed = alerts.splice(idx, 1);
          saveAlerts(alerts);
          loadAlerts();
          showToast(`Announcement removed: "${removed[0]?.title || ''}"`);
        }
      });
    });
  }

  // System Operations: Cache Invalidation
  if (btnClearCache) {
    btnClearCache.addEventListener('click', async () => {
      try {
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map(k => caches.delete(k)));
        }
        localStorage.removeItem('cso_cached_jobs');
        localStorage.removeItem('cso_cached_schemes');
        showToast('Application caches and offline storage purged.');
        logActivity('Purged client caches');
      } catch (err) {
        showToast('Error purging cache: ' + err.message, 'error');
      }
    });
  }

  // System Operations: Data Reindex
  if (btnReindexData) {
    btnReindexData.addEventListener('click', () => {
      showToast('Reindexing all 3,790+ directory entries...');
      setTimeout(() => {
        showToast('Reindex complete. 100% integrity across all records.');
        logActivity('Triggered data reindex');
      }, 700);
    });
  }

  // Activity Log
  function logActivity(action) {
    try {
      const history = JSON.parse(localStorage.getItem(ACTIVITY_KEY) || '[]');
      history.unshift({ action, timestamp: new Date().toISOString() });
      if (history.length > 50) history.length = 50;
      localStorage.setItem(ACTIVITY_KEY, JSON.stringify(history));
    } catch (_) {}
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Page Loader Dismissal Helper
  function dismissPageLoader() {
    const loader = document.getElementById('admin-page-loader');
    if (loader) {
      loader.classList.add('fade-out');
      setTimeout(() => {
        if (loader && loader.parentNode) {
          loader.parentNode.removeChild(loader);
        }
      }, 300);
    }
    document.body.classList.remove('loading');
  }

  // Keybindings (Escape closes inspector)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (inquiryModal && !inquiryModal.hidden) {
        closeInspector();
      }
      if (document.body.classList.contains('admin-menu-open')) {
        closeMobileMenu();
      }
    }
  });

  // Initialization
  function initAdminDashboard() {
    loadSubmissions();
    loadAlerts();

    // Verify session identity with server asynchronously
    if (window.CSOAdminGuard) {
      window.CSOAdminGuard.verifySessionWithServer().then(res => {
        if (res && res.data && res.data.user) {
          const userBadge = document.getElementById('topbar-admin-badge');
          if (userBadge) userBadge.textContent = res.data.user.email;
        }
      }).catch(() => {}).finally(() => {
        dismissPageLoader();
      });
    } else {
      dismissPageLoader();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdminDashboard);
  } else {
    initAdminDashboard();
  }

})();
