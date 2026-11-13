/**
 * Common Sense Odisha — Candidate Hub (Split-Focus Bento & 4-Tier Personalization)
 * Strict CSP-compliant: ZERO .innerHTML, ZERO .style.*, ZERO inline handlers.
 */
(function () {
  'use strict';

  const SESSION_KEY = 'cso_candidate_session_v1';
  const PROFILE_KEY = 'cso_candidate_profile';
  const THEME_KEY = 'cso_student_theme';
  const CHECKLIST_KEY = 'cso_candidate_checklist_v1';
  const PREFS_KEY = 'cso_candidate_prefs_v1';
  const MISTAKES_KEY = 'cso_candidate_mistakes_v1';
  const LOCKER_KEY = 'cso_candidate_locker_v1';
  const NOTES_KEY = 'cso_candidate_notes_v1';
  const SCORES_KEY = 'cso_candidate_mock_scores_v1';

  const ODISHA_DISTRICTS = [
    'Angul', 'Balangir', 'Balasore (Baleswar)', 'Bargarh', 'Bhadrak', 'Boudh',
    'Cuttack', 'Deogarh', 'Dhenkanal', 'Gajapati', 'Ganjam', 'Jagatsinghpur',
    'Jajpur', 'Jharsuguda', 'Kalahandi', 'Kandhamal', 'Kendrapara', 'Kendujhar (Keonjhar)',
    'Khordha (Bhubaneswar)', 'Koraput', 'Malkangiri', 'Mayurbhanj', 'Nabarangpur',
    'Nayagarh', 'Nuapada', 'Puri', 'Rayagada', 'Sambalpur', 'Subarnapur (Sonepur)', 'Sundargarh'
  ];

  const LOCKER_ITEMS = [
    { id: 'aadhaar', label: 'Aadhaar Card (e-KYC & NPCI Seeded)' },
    { id: 'resident', label: 'Odisha Resident / Domicile Certificate' },
    { id: 'caste', label: 'Caste / SEBC / EWS Certificate (Valid)' },
    { id: 'income', label: 'Income Certificate (Scholarship / Fee Waiver)' },
    { id: 'degree', label: '10th, +2, Graduation Marksheets & Provisional' },
    { id: 'photo_sig', label: 'Passport Photo & Scanned Signature (20-50 KB)' }
  ];

  const GK_DRILL_BANK = [
    { q: 'Which river is known as the "Sorrow of Odisha"?', opts: ['Mahanadi', 'Brahmani', 'Baitarani', 'Rushikulya'], ans: 0, exp: 'Mahanadi has historically caused severe deltaic floods in coastal Odisha.' },
    { q: 'Under NEP 2020, what is the new curricular structure replacing 10+2?', opts: ['5+3+3+4', '4+4+4+2', '6+3+3', '5+4+3'], ans: 0, exp: 'NEP 2020 introduces the 5+3+3+4 Foundational, Preparatory, Middle, and Secondary stages.' },
    { q: 'Where is the headquarters of Odisha Staff Selection Commission (OSSC)?', opts: ['Cuttack', 'Bhubaneswar', 'Sambalpur', 'Puri'], ans: 1, exp: 'OSSC is headquartered at Barrack No. 1, Unit V, Bhubaneswar.' },
    { q: 'Who founded the Satyabadi Bana Vidyalaya in Puri district?', opts: ['Madhusudan Das', 'Gopabandhu Das', 'Fakir Mohan Senapati', 'Krushna Chandra Gajapati'], ans: 1, exp: 'Utkalmani Pandit Gopabandhu Das established Satyabadi Bana Vidyalaya in 1909.' },
    { q: 'Which Article of the Indian Constitution guarantees Right to Education (6–14 years)?', opts: ['Article 19', 'Article 21A', 'Article 32', 'Article 45'], ans: 1, exp: 'The 86th Constitutional Amendment inserted Article 21A making elementary education a fundamental right.' }
  ];

  const state = {
    user: null,
    controls: {
      account_status: 'active',
      permissions: { canTakeCbt: true, canEditProfile: true, canSyncCloud: true, canBookmark: true, canExportData: true },
      assigned_exams: [],
      lock_exam_preferences: false,
      admin_notice_text: null,
      admin_notice_level: 'info'
    },
    preferences: {
      domain: 'teaching-education',
      track: 'bed-entrances',
      primaryExam: 'odisha-bed',
      selectedExams: ['odisha-bed'],
      selectedStreams: {}
    },
    taxonomy: [],
    attempts: [],
    schemes: [],
    resources: [],
    allFeedMode: false,
    activeChecklistExam: null,
    modalDraft: { domain: null, track: null, primaryExam: null, selectedExams: [], selectedStreams: {} }
  };

  /* ---------- Safe DOM Helpers ---------- */
  function clear(node) {
    while (node && node.firstChild) node.removeChild(node.firstChild);
    return node;
  }

  function el(tag, className, text) {
    const n = document.createElement(tag);
    if (className) n.className = className;
    if (text !== undefined && text !== null) n.textContent = String(text);
    return n;
  }

  function readJsonStorage(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function writeJsonStorage(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch {}
  }

  function showToast(msg, isError) {
    const host = document.getElementById('cso-toast-container');
    if (!host) return;
    const t = el('div', isError ? 'cso-toast is-error' : 'cso-toast', msg);
    host.appendChild(t);
    setTimeout(() => t.remove(), 3200);
  }

  function snapPctClass(prefix, pct) {
    const clamped = Math.max(0, Math.min(100, Math.round(pct / 10) * 10));
    return prefix + clamped;
  }

  function snapRingClass(pct) {
    const clamped = Math.max(0, Math.min(100, Math.round(pct / 5) * 5));
    return 'cso-ring-' + clamped;
  }

  function initials(name) {
    const parts = String(name || 'OA').trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return (parts[0].slice(0, 2) || 'OA').toUpperCase();
  }

  /* ---------- Theme Switcher ---------- */
  function applyTheme(theme) {
    const valid = (theme === 'obsidian-mint' || theme === 'alabaster-cobalt') ? theme : 'alabaster-cobalt';
    document.documentElement.dataset.csoStudentTheme = valid;
    try { localStorage.setItem(THEME_KEY, valid); } catch {}
    const lbl = document.getElementById('cso-theme-label');
    if (lbl) lbl.textContent = valid === 'obsidian-mint' ? 'Night' : 'Day';
  }

  function initThemeSwitcher() {
    applyTheme(document.documentElement.dataset.csoStudentTheme || 'alabaster-cobalt');
    const btn = document.getElementById('cso-theme-toggle');
    if (btn) {
      btn.addEventListener('click', () => {
        const cur = document.documentElement.dataset.csoStudentTheme;
        applyTheme(cur === 'obsidian-mint' ? 'alabaster-cobalt' : 'obsidian-mint');
      });
    }
  }

  /* ---------- Tab & Sidebar Navigation ---------- */
  const TAB_META = {
    'tab-overview': ['Candidate Overview', 'Personalized exam readiness, live deadlines & synced workspace'],
    'tab-my-learning': ['My Learning & Syllabi', 'Auto-provisioned exam checklists synced with D1'],
    'tab-bookmarks': ['Private Library & Pins', 'Exam-matched PYQs, saved alerts, and mock tests'],
    'tab-achievements': ['Readiness & Streaks', 'Live preparation milestones computed from D1 activity'],
    'tab-profile-settings': ['Profile & Account Settings', 'Manage personal identity, 4-tier goals, and backups'],
    'tool-calendar': ['Target Exam Calendar', 'Countdown schedule filtered to your active goals'],
    'tool-locker': ['Document Locker', 'Odisha recruitment & scholarship KYC readiness'],
    'tool-notes': ['Revision Scratchpad', 'Auto-saved study notes and quick recall facts'],
    'tool-analytics': ['CBT Analytics & Mistake Log', 'Live D1 test history, trend chart & spaced-repetition log'],
    'tool-study-timer': ['Focus Timer', 'Pomodoro study sprints for sustained concentration'],
    'tool-exam-calculator': ['Cutoff & Negative Marks', 'Instant net score calculator across exam schemes'],
    'tool-daily-drill': ['Daily GK Drill', 'Rapid recall practice for Odisha GK & Pedagogy']
  };

  function switchTab(tabId) {
    if (!tabId || !document.getElementById(tabId)) return;
    document.querySelectorAll('.bp-tab-view').forEach(v => v.classList.toggle('active', v.id === tabId));
    document.querySelectorAll('.bp-nav-item[data-tab], .bp-bottom-nav-btn[data-tab]').forEach(a => a.classList.toggle('active', a.dataset.tab === tabId));
    const meta = TAB_META[tabId];
    if (meta) {
      const t = document.getElementById('bp-topbar-title');
      const s = document.getElementById('bp-topbar-subtitle');
      if (t) t.textContent = meta[0];
      if (s) s.textContent = meta[1];
    }
    const sb = document.getElementById('bp-sidebar');
    if (sb) sb.classList.remove('mobile-open');
  }

  function initNavigation() {
    document.querySelectorAll('[data-tab]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        switchTab(link.dataset.tab);
      });
    });

    const sb = document.getElementById('bp-sidebar');
    const navScroll = sb?.querySelector('.bp-nav-scroll');
    if (navScroll) navScroll.scrollTop = 0;
    document.getElementById('bp-sidebar-toggle-btn')?.addEventListener('click', () => sb?.classList.toggle('is-collapsed'));
    document.getElementById('bp-mobile-menu-trigger')?.addEventListener('click', () => sb?.classList.toggle('mobile-open'));
    document.getElementById('bp-topbar-user-btn')?.addEventListener('click', () => switchTab('tab-profile-settings'));
    document.getElementById('bp-sidebar-user-btn')?.addEventListener('click', () => switchTab('tab-profile-settings'));

    const hashTab = String(window.location.hash || '').replace(/^#/, '');
    if (hashTab && document.getElementById(hashTab)) {
      switchTab(hashTab);
    }
    initPwaLiveStatus();
  }

  async function refreshOfflineSyncPill() {
    const pill = document.getElementById('cso-sync-pill');
    if (!pill) return;
    let queuedCount = 0;
    try {
      if (window.CSOIdb && typeof window.CSOIdb.getSyncQueue === 'function') {
        const q = await window.CSOIdb.getSyncQueue();
        queuedCount = Array.isArray(q) ? q.length : 0;
      }
    } catch (_) {}

    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    pill.hidden = false;
    pill.classList.remove('is-offline', 'is-pending', 'is-synced');
    if (offline || queuedCount > 0) {
      pill.classList.add(offline ? 'is-offline' : 'is-pending');
      pill.textContent = queuedCount > 0 ? `Offline Mode — ${queuedCount} Queued` : 'Offline Mode — Queued';
    } else {
      pill.classList.add('is-synced');
      pill.textContent = 'Synced';
    }
  }

  function showSwUpdateToast(registration) {
    const host = document.getElementById('cso-toast-container');
    if (!host || document.getElementById('cso-sw-update-btn')) return;
    const btn = el('button', 'cso-sw-update-toast', 'App updated — Reload');
    btn.type = 'button';
    btn.id = 'cso-sw-update-btn';
    btn.addEventListener('click', () => {
      if (registration && registration.waiting) {
        try {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        } catch (_) {}
      }
      window.location.reload();
    });
    host.appendChild(btn);
  }

  function initPwaLiveStatus() {
    refreshOfflineSyncPill();
    window.addEventListener('online', refreshOfflineSyncPill);
    window.addEventListener('offline', refreshOfflineSyncPill);
    window.addEventListener('cso:saved-offline', refreshOfflineSyncPill);
    window.addEventListener('cso:sync-complete', refreshOfflineSyncPill);
    window.addEventListener('cso:sw-update-available', (e) => {
      showSwUpdateToast(e && e.detail ? e.detail.registration : null);
    });
  }

  /* ---------- Auth & Governance Rendering ---------- */
  function renderProfileAndControls() {
    const u = state.user || {};
    const name = u.fullName || u.name || 'Odisha Aspirant';
    const district = u.district || 'Odisha';
    const av = initials(name);

    ['bp-side-avatar', 'bp-top-avatar', 'cso-profile-avatar'].forEach(id => {
      const n = document.getElementById(id);
      if (n) n.textContent = av;
    });
    ['bp-side-name', 'bp-top-name', 'cso-profile-name', 'tab-settings-name'].forEach(id => {
      const n = document.getElementById(id);
      if (n) n.textContent = name;
    });
    ['bp-side-district', 'bp-top-district', 'cso-profile-id', 'tab-settings-district'].forEach(id => {
      const n = document.getElementById(id);
      if (n) n.textContent = district;
    });

    const skel = document.getElementById('cso-profile-skeleton');
    const det = document.getElementById('cso-profile-details');
    if (skel) skel.hidden = true;
    if (det) det.hidden = false;

    const primaryObj = getExamById(state.preferences.primaryExam);
    const badge = document.getElementById('cso-profile-stream-badge');
    if (badge) badge.textContent = primaryObj ? primaryObj.short_code : 'TARGETING GOALS';

    const primText = document.getElementById('tab-settings-primary');
    if (primText) primText.textContent = primaryObj ? primaryObj.exam_label : 'Not set';

    const stText = document.getElementById('tab-settings-status');
    if (stText) stText.textContent = (state.controls.account_status || 'active').toUpperCase();

    // Admin Notice Banner
    const noticeBanner = document.getElementById('cso-admin-notice-banner');
    const noticeLvl = document.getElementById('cso-admin-notice-level');
    const noticeTxt = document.getElementById('cso-admin-notice-text');
    const notifDot = document.getElementById('bp-notif-dot');
    if (noticeBanner && state.controls.admin_notice_text) {
      noticeBanner.hidden = false;
      noticeBanner.classList.remove('is-warning', 'is-urgent');
      if (state.controls.admin_notice_level === 'warning') noticeBanner.classList.add('is-warning');
      if (state.controls.admin_notice_level === 'urgent') noticeBanner.classList.add('is-urgent');
      if (noticeLvl) noticeLvl.textContent = (state.controls.admin_notice_level || 'info').toUpperCase();
      if (noticeTxt) noticeTxt.textContent = state.controls.admin_notice_text;
      if (notifDot) notifDot.hidden = false;
    } else if (noticeBanner) {
      noticeBanner.hidden = true;
    }

    // Governance locks & permissions
    const isRestricted = state.controls.account_status === 'restricted';
    const perms = state.controls.permissions || {};
    const editBtn = document.getElementById('btn-open-profile-editor-tab');
    if (editBtn) editBtn.disabled = isRestricted || perms.canEditProfile === false;
    const exportBtn = document.getElementById('btn-export-json-backup');
    if (exportBtn) exportBtn.disabled = perms.canExportData === false;

    const locked = Boolean(state.controls.lock_exam_preferences);
    const editGoalsBtn = document.getElementById('cso-open-goal-modal-btn');
    const settingsGoalsBtn = document.getElementById('btn-open-goals-settings');
    const lockBadge = document.getElementById('cso-goal-locked-badge');
    if (editGoalsBtn) editGoalsBtn.hidden = locked || isRestricted;
    if (settingsGoalsBtn) settingsGoalsBtn.disabled = locked || isRestricted;
    if (lockBadge) lockBadge.hidden = !locked;
  }

  async function performSignOut() {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {}
    [SESSION_KEY, PROFILE_KEY, 'cso_auth_token'].forEach(k => {
      try { localStorage.removeItem(k); } catch {}
    });
    if (window.CSOIdb && typeof window.CSOIdb.clearSyncQueue === 'function') {
      try { await window.CSOIdb.clearSyncQueue(); } catch {}
    }
    window.location.replace('/login.html');
  }

  /* ---------- Taxonomy & Focus Helpers ---------- */
  function getExamById(id) {
    return state.taxonomy.find(e => e.id === id) || null;
  }

  function getActiveExams() {
    if (state.allFeedMode) return state.taxonomy;
    const ids = (state.controls.lock_exam_preferences && state.controls.assigned_exams.length)
      ? state.controls.assigned_exams
      : (state.preferences.selectedExams || []);
    const matched = ids.map(getExamById).filter(Boolean);
    return matched.length ? matched : state.taxonomy.slice(0, 3);
  }

  function renderFocusBar() {
    const host = document.getElementById('cso-focus-pills-list');
    if (!host) return;
    clear(host);

    const active = getActiveExams();
    const displayList = state.allFeedMode ? active.slice(0, 4) : active;
    displayList.forEach(ex => {
      const isPrimary = ex.id === state.preferences.primaryExam;
      const stream = state.preferences.selectedStreams && state.preferences.selectedStreams[ex.id];
      const label = (isPrimary ? '★ ' : '') + ex.short_code + (stream ? (' (' + stream + ')') : '');
      const pill = el('button', isPrimary ? 'cso-focus-pill is-primary' : 'cso-focus-pill', label);
      pill.type = 'button';
      pill.addEventListener('click', () => {
        state.activeChecklistExam = ex.id;
        switchTab('tab-my-learning');
        renderChecklistTracker();
      });
      host.appendChild(pill);
    });

    if (state.allFeedMode && active.length > 4) {
      host.appendChild(el('span', 'cso-muted-note', '+' + (active.length - 4) + ' more'));
    }

    const toggle = document.getElementById('cso-all-feed-toggle');
    if (toggle) {
      toggle.classList.toggle('is-active', state.allFeedMode);
      toggle.setAttribute('aria-pressed', state.allFeedMode ? 'true' : 'false');
    }
  }

  /* ---------- 4-Tier Hierarchical Goal Selector Modal ---------- */
  function openGoalModal() {
    if (state.controls.lock_exam_preferences) {
      showToast('Exam preferences are locked by your administrator.', true);
      return;
    }
    const modal = document.getElementById('cso-goal-modal');
    if (!modal) return;
    const first = getExamById(state.preferences.primaryExam) || state.taxonomy[0];
    state.modalDraft = {
      domain: state.preferences.domain || (first && first.domain_slug) || null,
      track: state.preferences.track || (first && first.track_slug) || null,
      primaryExam: state.preferences.primaryExam || (first && first.id) || null,
      selectedExams: [...(state.preferences.selectedExams || [])],
      selectedStreams: { ...(state.preferences.selectedStreams || {}) }
    };
    const searchInp = document.getElementById('cso-goal-search-input');
    if (searchInp) searchInp.value = '';
    modal.hidden = false;
    renderGoalModalTiers('');
  }

  function renderGoalModalTiers(query) {
    const domHost = document.getElementById('cso-tier1-domains');
    const trkHost = document.getElementById('cso-tier2-tracks');
    const exHost = document.getElementById('cso-tier3-exams');
    const strHost = document.getElementById('cso-tier4-streams');
    const sumEl = document.getElementById('cso-goal-selection-summary');
    if (!domHost || !trkHost || !exHost || !strHost) return;

    const q = String(query || '').trim().toLowerCase();

    // Tier 1: Domains
    const domainsMap = new Map();
    state.taxonomy.forEach(ex => {
      if (!domainsMap.has(ex.domain_slug)) domainsMap.set(ex.domain_slug, ex.domain_label);
    });
    clear(domHost);
    domainsMap.forEach((lbl, slug) => {
      const b = el('button', slug === state.modalDraft.domain ? 'cso-tier-btn active' : 'cso-tier-btn', lbl);
      b.type = 'button';
      b.addEventListener('click', () => {
        state.modalDraft.domain = slug;
        const firstInDom = state.taxonomy.find(e => e.domain_slug === slug);
        state.modalDraft.track = firstInDom ? firstInDom.track_slug : null;
        renderGoalModalTiers(q);
      });
      domHost.appendChild(b);
    });

    // Tier 2: Tracks in selected domain
    const tracksMap = new Map();
    state.taxonomy.filter(ex => !state.modalDraft.domain || ex.domain_slug === state.modalDraft.domain)
      .forEach(ex => {
        if (!tracksMap.has(ex.track_slug)) tracksMap.set(ex.track_slug, ex.track_label);
      });
    clear(trkHost);
    tracksMap.forEach((lbl, slug) => {
      const b = el('button', slug === state.modalDraft.track ? 'cso-tier-btn active' : 'cso-tier-btn', lbl);
      b.type = 'button';
      b.addEventListener('click', () => {
        state.modalDraft.track = slug;
        renderGoalModalTiers(q);
      });
      trkHost.appendChild(b);
    });

    // Tier 3: Exams (search across all if q is non-empty, else filter by domain+track)
    const examsList = q
      ? state.taxonomy.filter(ex => (ex.exam_label + ' ' + ex.short_code + ' ' + ex.track_label + ' ' + ex.domain_label).toLowerCase().includes(q))
      : state.taxonomy.filter(ex => (!state.modalDraft.domain || ex.domain_slug === state.modalDraft.domain) && (!state.modalDraft.track || ex.track_slug === state.modalDraft.track));

    clear(exHost);
    if (!examsList.length) {
      exHost.appendChild(el('p', 'cso-muted-note', 'No exams match this filter.'));
    } else {
      examsList.forEach(ex => {
        const row = el('div', 'cso-exam-pick-row');
        const lbl = el('label', 'cso-exam-pick-label');
        const chk = document.createElement('input');
        chk.type = 'checkbox';
        chk.checked = state.modalDraft.selectedExams.includes(ex.id);
        chk.addEventListener('change', () => {
          if (chk.checked) {
            if (!state.modalDraft.selectedExams.includes(ex.id)) state.modalDraft.selectedExams.push(ex.id);
            if (!state.modalDraft.primaryExam) state.modalDraft.primaryExam = ex.id;
          } else {
            state.modalDraft.selectedExams = state.modalDraft.selectedExams.filter(id => id !== ex.id);
            if (state.modalDraft.primaryExam === ex.id) {
              state.modalDraft.primaryExam = state.modalDraft.selectedExams[0] || null;
            }
          }
          renderGoalModalTiers(q);
        });
        lbl.appendChild(chk);
        lbl.appendChild(el('span', '', ex.exam_label));

        const star = el('button', state.modalDraft.primaryExam === ex.id ? 'cso-star-btn is-primary' : 'cso-star-btn', state.modalDraft.primaryExam === ex.id ? '★' : '☆');
        star.type = 'button';
        star.title = 'Set as Primary Goal';
        star.addEventListener('click', () => {
          if (!state.modalDraft.selectedExams.includes(ex.id)) state.modalDraft.selectedExams.push(ex.id);
          state.modalDraft.primaryExam = ex.id;
          renderGoalModalTiers(q);
        });

        row.appendChild(lbl);
        row.appendChild(star);
        exHost.appendChild(row);
      });
    }

    // Tier 4: Optional Stream/Paper selectors for selected exams that have streams
    clear(strHost);
    const withStreams = state.modalDraft.selectedExams.map(getExamById).filter(ex => ex && Array.isArray(ex.streams) && ex.streams.length > 0);
    if (!withStreams.length) {
      strHost.hidden = true;
    } else {
      strHost.hidden = false;
      strHost.appendChild(el('strong', '', 'Tier 4: Optional Stream / Paper Specialization'));
      withStreams.forEach(ex => {
        const wrap = el('div', 'cso-field');
        const lbl = el('label', '', ex.short_code + ' Stream / Paper');
        const sel = el('select', 'cso-input');
        ex.streams.forEach(st => {
          const opt = el('option', '', st);
          opt.value = st;
          sel.appendChild(opt);
        });
        sel.value = state.modalDraft.selectedStreams[ex.id] || ex.streams[0];
        state.modalDraft.selectedStreams[ex.id] = sel.value;
        sel.addEventListener('change', () => {
          state.modalDraft.selectedStreams[ex.id] = sel.value;
        });
        wrap.appendChild(lbl);
        wrap.appendChild(sel);
        strHost.appendChild(wrap);
      });
    }

    if (sumEl) sumEl.textContent = state.modalDraft.selectedExams.length + ' exam(s) selected';
  }

  async function saveGoalModal() {
    if (!state.modalDraft.selectedExams.length) {
      showToast('Select at least one target exam.', true);
      return;
    }
    const payload = {
      domain: state.modalDraft.domain,
      track: state.modalDraft.track,
      primaryExam: state.modalDraft.primaryExam || state.modalDraft.selectedExams[0],
      selectedExams: state.modalDraft.selectedExams,
      selectedStreams: state.modalDraft.selectedStreams
    };
    const btn = document.getElementById('cso-goal-save-btn');
    if (btn) btn.disabled = true;
    try {
      const res = await fetch('/api/user/preferences', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-CSO-CSRF': '1' },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to save preferences');

      state.preferences = payload;
      writeJsonStorage(PREFS_KEY, payload);
      state.activeChecklistExam = payload.primaryExam;
      document.getElementById('cso-goal-modal').hidden = true;
      showToast('Workspace personalized for your selected goals!');
      renderAllPersonalizedViews();
    } catch (e) {
      showToast(e.message || 'Could not save goals', true);
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  /* ---------- Syllabus Checklists & Readiness Ring ---------- */
  function getSavedChecklists() {
    return readJsonStorage(CHECKLIST_KEY, {});
  }

  function computeExamStats(exam) {
    const saved = getSavedChecklists();
    const examSaved = saved[exam.id] || {};
    const topics = Array.isArray(exam.syllabus) ? exam.syllabus : [];
    const total = topics.length;
    let done = 0;
    topics.forEach(t => {
      const paperKey = t.paper || 'core';
      if ((examSaved[paperKey] && examSaved[paperKey][t.id]) || examSaved[t.id]) done++;
    });
    const percent = total ? Math.round((done / total) * 100) : 0;
    return { done, total, percent };
  }

  function renderReadinessHero() {
    const active = getActiveExams();
    let totalTopics = 0;
    let doneTopics = 0;
    active.forEach(ex => {
      const st = computeExamStats(ex);
      totalTopics += st.total;
      doneTopics += st.done;
    });
    const syllabusPct = totalTopics ? Math.round((doneTopics / totalTopics) * 100) : 0;

    let cbtPct = 0;
    if (state.attempts.length) {
      const recent = state.attempts.slice(0, 5);
      const sum = recent.reduce((acc, a) => acc + Number(a.accuracy || 0), 0);
      cbtPct = Math.round(sum / recent.length);
    }

    const sprints = Number(readJsonStorage('cso_pomodoro_sprints_today', 0)) || 0;
    const consistencyPct = Math.min(100, (state.attempts.length ? 50 : 20) + sprints * 15 + (doneTopics > 0 ? 30 : 0));

    const score = Math.round((syllabusPct * 0.4) + (cbtPct * 0.4) + (consistencyPct * 0.2));

    const ring = document.getElementById('cso-readiness-ring');
    if (ring) {
      for (let i = 0; i <= 100; i += 5) ring.classList.remove('cso-ring-' + i);
      ring.classList.add(snapRingClass(score));
    }
    const pctEl = document.getElementById('cso-readiness-pct');
    if (pctEl) pctEl.textContent = score + '%';
    const sylEl = document.getElementById('cso-metric-syllabus');
    if (sylEl) sylEl.textContent = syllabusPct + '%';
    const cbtEl = document.getElementById('cso-metric-cbt');
    if (cbtEl) cbtEl.textContent = cbtPct + '%';
    const strEl = document.getElementById('cso-metric-streak');
    if (strEl) strEl.textContent = consistencyPct + '%';

    const prim = getExamById(state.preferences.primaryExam) || active[0];
    const targetText = document.getElementById('cso-daily-target-text');
    if (targetText && prim) {
      const primStats = computeExamStats(prim);
      const rem = Math.max(0, primStats.total - primStats.done);
      let daysLeft = 30;
      if (prim.next_exam_date) {
        const diff = Math.ceil((Date.parse(prim.next_exam_date) - Date.now()) / 86400000);
        if (diff > 0) daysLeft = diff;
      }
      const perDay = rem > 0 ? Math.max(1, Math.ceil(rem / Math.min(daysLeft, 30))) : 0;
      targetText.textContent = rem > 0
        ? `Daily Target: Complete ${perDay} topic(s)/day for ${prim.short_code} (${daysLeft}d left)`
        : `${prim.short_code} syllabus completed! Focus on CBT revisions.`;
    }

    const achBadge = document.getElementById('ach-readiness-badge');
    if (achBadge) achBadge.textContent = `Readiness: ${score}/100`;
    renderAchievements(score, doneTopics, state.attempts.length, sprints);
  }

  function buildPaperPills(ex) {
    const saved = getSavedChecklists()[ex.id] || {};
    const byPaper = new Map();
    (ex.syllabus || []).forEach(t => {
      const paper = t.paper || 'Paper-I';
      if (!byPaper.has(paper)) byPaper.set(paper, { done: 0, total: 0 });
      const entry = byPaper.get(paper);
      entry.total += 1;
      if (saved[paper] && saved[paper][t.id]) entry.done += 1;
    });
    if (!byPaper.size) return null;
    const wrap = el('div', 'cso-paper-pills');
    byPaper.forEach((counts, paper) => {
      wrap.appendChild(el('span', 'cso-paper-pill', `${paper}: ${counts.done}/${counts.total}`));
    });
    return wrap;
  }

  function renderTargetExamCards() {
    const grid = document.getElementById('cso-target-exam-cards');
    if (!grid) return;
    clear(grid);
    const active = getActiveExams();
    const isSingle = active.length === 1;
    active.slice(0, 6).forEach(ex => {
      const st = computeExamStats(ex);
      const card = el('div', isSingle ? 'bp-exam-card bp-exam-card-full' : 'bp-exam-card');
      const head = el('div', 'bp-exam-card-head');
      head.appendChild(el('span', 'cso-pill-badge', ex.short_code));
      head.appendChild(el('span', 'cso-muted-note', st.percent + '%'));
      card.appendChild(head);
      card.appendChild(el('h3', '', ex.exam_label));
      card.appendChild(el('p', 'cso-muted-note', `${st.done}/${st.total} topics · ${ex.next_exam_date || 'Date TBA'}`));

      const pills = buildPaperPills(ex);
      if (pills) card.appendChild(pills);

      const track = el('div', 'bp-progress-track');
      const fill = el('div', 'bp-progress-fill ' + snapPctClass('w-pct-', st.percent));
      track.appendChild(fill);
      card.appendChild(track);

      const btn = el('button', 'cso-btn cso-btn-sm', 'Open Checklist →');
      btn.type = 'button';
      btn.addEventListener('click', () => {
        state.activeChecklistExam = ex.id;
        switchTab('tab-my-learning');
        renderChecklistTracker();
      });
      card.appendChild(btn);
      grid.appendChild(card);
    });
  }

  function renderPriorityTopics() {
    const host = document.getElementById('overview-priority-topics');
    if (!host) return;
    clear(host);
    const active = getActiveExams();
    const saved = getSavedChecklists();
    const pending = [];
    active.forEach(ex => {
      const exSaved = saved[ex.id] || {};
      (ex.syllabus || []).forEach(t => {
        const paper = t.paper || 'core';
        const isDone = Boolean(exSaved[paper] && exSaved[paper][t.id]);
        if (!isDone) pending.push({ exam: ex, topic: t });
      });
    });

    if (!pending.length) {
      host.appendChild(el('p', 'cso-muted-note', 'All topics in your selected exams are checked off!'));
      return;
    }
    pending.slice(0, 4).forEach(item => {
      const row = el('div', 'cso-list-item');
      const main = el('div', 'cso-list-item-main');
      main.appendChild(el('h4', 'cso-list-item-title', item.topic.topic));
      main.appendChild(el('span', 'cso-list-item-sub', `${item.exam.short_code} · ${item.topic.paper || 'Core'} · Weight ${item.topic.weightage || 20}%`));
      const go = el('button', 'cso-btn cso-btn-sm', 'Mark Done');
      go.type = 'button';
      go.addEventListener('click', () => toggleTopic(item.exam.id, item.topic.paper || 'core', item.topic.id, true));
      row.appendChild(main);
      row.appendChild(go);
      host.appendChild(row);
    });
  }

  function toggleTopic(examId, paper, topicId, checked) {
    const all = getSavedChecklists();
    if (!all[examId]) all[examId] = {};
    if (!all[examId][paper]) all[examId][paper] = {};
    all[examId][paper][topicId] = checked;
    writeJsonStorage(CHECKLIST_KEY, all);

    if (window.CSOSync && typeof window.CSOSync.toggleChecklistMilestone === 'function') {
      window.CSOSync.toggleChecklistMilestone({
        examStream: examId,
        milestone: `${paper}::${topicId}`,
        completed: checked,
        checklists: all
      });
    }
    renderReadinessHero();
    renderTargetExamCards();
    renderPriorityTopics();
    renderChecklistTracker();
  }

  function renderChecklistTracker() {
    const host = document.getElementById('candidate-tracker-list');
    const badge = document.getElementById('tracker-completion-badge');
    if (!host) return;
    clear(host);

    const active = getActiveExams();
    if (!state.activeChecklistExam || !active.some(e => e.id === state.activeChecklistExam)) {
      state.activeChecklistExam = (active[0] && active[0].id) || null;
    }

    const chipRow = el('div', 'cso-chip-row');
    active.forEach(ex => {
      const b = el('button', ex.id === state.activeChecklistExam ? 'bp-chip active' : 'bp-chip', ex.short_code);
      b.type = 'button';
      b.addEventListener('click', () => {
        state.activeChecklistExam = ex.id;
        renderChecklistTracker();
      });
      chipRow.appendChild(b);
    });
    host.appendChild(chipRow);

    const current = getExamById(state.activeChecklistExam) || active[0];
    if (!current) {
      host.appendChild(el('p', 'cso-muted-note', 'Select an exam goal to view its syllabus checklist.'));
      return;
    }

    const stats = computeExamStats(current);
    if (badge) badge.textContent = `${stats.percent}% Completed`;

    const saved = getSavedChecklists();
    const exSaved = saved[current.id] || {};

    // Group by paper
    const byPaper = new Map();
    (current.syllabus || []).forEach(t => {
      const p = t.paper || 'Core';
      if (!byPaper.has(p)) byPaper.set(p, []);
      byPaper.get(p).push(t);
    });

    if (!byPaper.size) {
      host.appendChild(el('p', 'cso-muted-note', 'No syllabus items provisioned for this exam yet.'));
      return;
    }

    let first = true;
    byPaper.forEach((topics, paper) => {
      const det = el('details', 'cso-stage-details');
      if (first) { det.open = true; first = false; }
      const sum = el('summary', 'cso-stage-summary');
      sum.appendChild(el('span', '', paper));
      const doneCnt = topics.filter(t => Boolean(exSaved[paper] && exSaved[paper][t.id])).length;
      sum.appendChild(el('span', 'cso-pill-badge', `${doneCnt}/${topics.length}`));
      det.appendChild(sum);

      const body = el('div', 'cso-stage-body');
      topics.forEach(t => {
        const isDone = Boolean(exSaved[paper] && exSaved[paper][t.id]);
        const row = el('label', isDone ? 'cso-topic-row is-done' : 'cso-topic-row');
        const left = el('div', 'cso-exam-pick-label');
        const chk = document.createElement('input');
        chk.type = 'checkbox';
        chk.checked = isDone;
        chk.addEventListener('change', () => toggleTopic(current.id, paper, t.id, chk.checked));
        left.appendChild(chk);
        left.appendChild(el('span', '', t.topic));
        row.appendChild(left);
        row.appendChild(el('span', 'cso-muted-note', (t.weightage || 20) + '%'));
        body.appendChild(row);
      });
      det.appendChild(body);
      host.appendChild(det);
    });
  }

  /* ---------- Countdowns & Calendar ---------- */
  function resolveDynamicCountdown(rawDate) {
    const now = new Date();
    const compute = window.CSOCountdown && typeof window.CSOCountdown.compute === 'function'
      ? window.CSOCountdown.compute
      : null;
    if (!compute || !rawDate) {
      return { info: null, displayDate: rawDate || 'TBA', rolledForward: false };
    }
    let candidate = String(rawDate).trim();
    let info = compute(candidate, now);
    let rolledForward = false;
    if (info && info.isPast && /^\d{4}-\d{2}-\d{2}$/.test(candidate)) {
      const parts = candidate.split('-').map(Number);
      for (let step = 1; step <= 3; step += 1) {
        const nextDate = `${parts[0] + step}-${String(parts[1]).padStart(2, '0')}-${String(parts[2]).padStart(2, '0')}`;
        const nextInfo = compute(nextDate, now);
        if (nextInfo && !nextInfo.isPast) {
          candidate = nextDate;
          info = nextInfo;
          rolledForward = true;
          break;
        }
      }
    }
    if (!info || info.isPast) {
      return { info: null, displayDate: rawDate, rolledForward: false };
    }
    return { info, displayDate: candidate, rolledForward };
  }

  function renderCountdownsAndCalendar() {
    const grid = document.getElementById('cso-countdown-grid');
    const calHost = document.getElementById('candidate-calendar-list');
    const active = getActiveExams().filter(e => e.next_exam_date);

    if (grid) {
      clear(grid);
      if (!active.length) {
        grid.appendChild(el('p', 'cso-muted-note', 'No scheduled exam dates for current selection.'));
      } else {
        const isSingle = active.length === 1;
        active.slice(0, 6).forEach(ex => {
          const resolved = resolveDynamicCountdown(ex.next_exam_date);
          const info = resolved.info;
          const urgClass = info ? ('cd-' + info.urgency) : 'cd-normal';
          const card = el('div', `cso-cd-card ${urgClass}${isSingle ? ' cso-cd-card-full' : ''}`);
          const head = el('div', 'cso-cd-head');
          head.appendChild(el('h4', 'cso-cd-title', isSingle ? `${ex.short_code} · ${ex.exam_label}` : ex.short_code));
          head.appendChild(el('span', 'cso-pill-badge', resolved.rolledForward ? 'NEXT CYCLE (EST.)' : (ex.countdown_status || 'TENTATIVE')));
          card.appendChild(head);

          if (info) {
            const tiles = el('div', 'cso-cd-tiles');
            [
              [String(info.days), 'DAYS'],
              [String(info.hours).padStart(2, '0'), 'HRS'],
              [String(info.minutes).padStart(2, '0'), 'MIN']
            ].forEach(pair => {
              const tile = el('div', 'cso-cd-tile');
              tile.appendChild(el('strong', '', pair[0]));
              tile.appendChild(el('span', '', pair[1]));
              tiles.appendChild(tile);
            });
            card.appendChild(tiles);
          } else {
            card.appendChild(el('div', 'cso-cd-timer', 'Cycle Window Open / Check Official Notification'));
          }

          if (isSingle) {
            const pills = buildPaperPills(ex);
            if (pills) card.appendChild(pills);
          }

          card.appendChild(el('div', 'cso-cd-meta', `${resolved.displayDate} · ${ex.domain_label || 'Odisha Exam'}`));
          grid.appendChild(card);
        });
      }
    }

    if (calHost) {
      clear(calHost);
      const sorted = [...active].sort((a, b) => String(a.next_exam_date).localeCompare(String(b.next_exam_date)));
      if (!sorted.length) {
        calHost.appendChild(el('p', 'cso-muted-note', 'No upcoming exam dates in your active focus.'));
      } else {
        sorted.forEach(ex => {
          const row = el('div', 'cso-list-item');
          const main = el('div', 'cso-list-item-main');
          main.appendChild(el('h4', 'cso-list-item-title', ex.exam_label));
          main.appendChild(el('span', 'cso-list-item-sub', `${ex.domain_label} · ${ex.countdown_status || 'TENTATIVE'}`));
          row.appendChild(main);
          row.appendChild(el('span', 'cso-pill-badge', ex.next_exam_date));
          calHost.appendChild(row);
        });
      }
    }
  }

  /* ---------- Live D1 CBT Analytics, Mistake Notebook & Manual Scores ---------- */
  function renderCbtAnalytics() {
    const sumHost = document.getElementById('cso-cbt-summary-stats');
    const chartHost = document.getElementById('cso-cbt-trend-chart');
    const listHost = document.getElementById('cso-cbt-attempts-list');
    if (!sumHost || !chartHost || !listHost) return;

    clear(sumHost);
    clear(chartHost);
    clear(listHost);

    const attempts = state.attempts;
    const total = attempts.length;
    const avgAcc = total ? Math.round(attempts.reduce((a, b) => a + Number(b.accuracy || 0), 0) / total) : 0;
    const bestPct = total ? Math.round(Math.max(...attempts.map(a => a.max_score ? (a.score / a.max_score) * 100 : 0))) : 0;

    [
      [String(total), 'D1 CBT Attempts'],
      [avgAcc + '%', 'Avg Accuracy'],
      [bestPct + '%', 'Best Score']
    ].forEach(pair => {
      const box = el('div', 'cso-cbt-kpi');
      box.appendChild(el('strong', '', pair[0]));
      box.appendChild(el('span', '', pair[1]));
      sumHost.appendChild(box);
    });

    const recent = attempts.slice(0, 8).reverse();
    if (!recent.length) {
      chartHost.appendChild(el('p', 'cso-muted-note', 'Complete a CBT mock test to populate your live score trend.'));
      listHost.appendChild(el('p', 'cso-muted-note', 'No D1 mock test attempts recorded yet.'));
      return;
    }

    recent.forEach((a, idx) => {
      const pct = a.max_score ? Math.round((a.score / a.max_score) * 100) : 0;
      const col = el('div', 'cso-bar-col');
      const fill = el('div', 'cso-bar-fill ' + snapPctClass('bar-h-', pct));
      fill.title = `${a.title}: ${a.score}/${a.max_score} (${pct}%)`;
      col.appendChild(fill);
      col.appendChild(el('span', 'cso-bar-lbl', 'T' + (idx + 1)));
      chartHost.appendChild(col);
    });

    attempts.slice(0, 10).forEach(a => {
      const row = el('div', 'cso-list-item');
      const main = el('div', 'cso-list-item-main');
      main.appendChild(el('h4', 'cso-list-item-title', a.title || 'Mock Test'));
      main.appendChild(el('span', 'cso-list-item-sub', `${a.target_exam || 'General'} · Accuracy ${Math.round(a.accuracy || 0)}% · ${String(a.created_at || '').slice(0, 10)}`));
      row.appendChild(main);
      row.appendChild(el('span', 'cso-pill-badge', `${a.score}/${a.max_score}`));
      listHost.appendChild(row);
    });
  }

  function initMistakeNotebook() {
    const form = document.getElementById('cso-mistake-form');
    const listHost = document.getElementById('cso-mistake-list');
    function draw() {
      if (!listHost) return;
      clear(listHost);
      const items = readJsonStorage(MISTAKES_KEY, []);
      if (!items.length) {
        listHost.appendChild(el('p', 'cso-muted-note', 'Log missed questions or tricky concepts for active recall.'));
        return;
      }
      items.slice(0, 15).forEach((m, idx) => {
        const row = el('div', 'cso-list-item');
        const main = el('div', 'cso-list-item-main');
        main.appendChild(el('h4', 'cso-list-item-title', m.topic));
        main.appendChild(el('span', 'cso-list-item-sub', m.note));
        const del = el('button', 'cso-btn cso-btn-sm', 'Mastered ✓');
        del.type = 'button';
        del.addEventListener('click', () => {
          const cur = readJsonStorage(MISTAKES_KEY, []);
          cur.splice(idx, 1);
          writeJsonStorage(MISTAKES_KEY, cur);
          draw();
        });
        row.appendChild(main);
        row.appendChild(del);
        listHost.appendChild(row);
      });
    }
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const topic = document.getElementById('cso-mistake-topic').value.trim();
        const note = document.getElementById('cso-mistake-note').value.trim();
        if (!topic || !note) return;
        const cur = readJsonStorage(MISTAKES_KEY, []);
        cur.unshift({ topic, note, createdAt: new Date().toISOString() });
        writeJsonStorage(MISTAKES_KEY, cur.slice(0, 50));
        form.reset();
        draw();
        showToast('Added to Mistake Notebook');
      });
    }
    draw();
  }

  function initManualScoreLogger() {
    const form = document.getElementById('form-log-mock-score');
    const listHost = document.getElementById('candidate-scores-list');
    function draw() {
      if (!listHost) return;
      clear(listHost);
      const list = readJsonStorage(SCORES_KEY, []);
      if (!list.length) {
        listHost.appendChild(el('p', 'cso-muted-note', 'No manual offline scores logged yet.'));
        return;
      }
      list.slice(0, 10).forEach(s => {
        const row = el('div', 'cso-list-item');
        const main = el('div', 'cso-list-item-main');
        main.appendChild(el('h4', 'cso-list-item-title', s.examName));
        main.appendChild(el('span', 'cso-list-item-sub', `${s.accuracyRate}% accuracy`));
        row.appendChild(main);
        row.appendChild(el('span', 'cso-pill-badge', `${s.score}/${s.totalMarks}`));
        listHost.appendChild(row);
      });
    }
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const examName = document.getElementById('score-exam-name').value.trim();
        const score = Number(document.getElementById('score-obtained').value);
        const totalMarks = Number(document.getElementById('score-total').value);
        if (!examName || !totalMarks) return;
        const accuracyRate = Math.round((score / totalMarks) * 100);
        const list = readJsonStorage(SCORES_KEY, []);
        list.unshift({ examName, score, totalMarks, accuracyRate, createdAt: new Date().toISOString() });
        writeJsonStorage(SCORES_KEY, list.slice(0, 30));
        form.reset();
        draw();
        showToast('Offline score saved!');
      });
    }
    draw();
  }

  /* ---------- Schemes, Resources/PYQs & Bookmarks ---------- */
  function renderSchemes() {
    const host = document.getElementById('candidate-schemes-list');
    if (!host) return;
    clear(host);
    if (!state.schemes.length) {
      host.appendChild(el('p', 'cso-muted-note', 'No active scholarship programs found.'));
      return;
    }
    state.schemes.forEach(sc => {
      const row = el('div', 'cso-list-item');
      const main = el('div', 'cso-list-item-main');
      main.appendChild(el('h4', 'cso-list-item-title', sc.title));
      main.appendChild(el('span', 'cso-list-item-sub', `${sc.category} · Deadline: ${sc.deadline || 'Open'}`));
      const a = el('a', 'cso-btn cso-btn-sm', 'View →');
      a.href = sc.url || '/schemes-benefits/';
      row.appendChild(main);
      row.appendChild(a);
      host.appendChild(row);
    });
  }

  function renderResourcesShelf() {
    const overHost = document.getElementById('overview-pyq-shelf');
    const tabHost = document.getElementById('candidate-pyq-shelf');
    const active = getActiveExams();
    const tagSet = new Set();
    active.forEach(ex => {
      tagSet.add(ex.short_code.toLowerCase());
      tagSet.add(ex.id.toLowerCase());
      (ex.parent_tags || []).forEach(t => tagSet.add(String(t).toLowerCase()));
    });

    const matched = state.resources.filter(r => {
      const hay = ((r.exam || '') + ' ' + (r.title || '')).toLowerCase();
      for (const tag of tagSet) {
        if (tag.length > 2 && hay.includes(tag)) return true;
      }
      return false;
    });
    const isFallback = matched.length === 0;
    const generalTeaching = isFallback
      ? state.resources.filter(r => /odisha|teaching|b\.ed|pedagogy|gk|general/i.test(`${r.exam || ''} ${r.title || ''} ${r.kind || ''}`))
      : [];
    const display = matched.length ? matched : (generalTeaching.length ? generalTeaching : state.resources);

    [overHost, tabHost].forEach((host, idx) => {
      if (!host) return;
      clear(host);
      if (!display.length) {
        host.appendChild(el('p', 'cso-muted-note', 'General Odisha & Teaching study packs are available in the main repository.'));
      } else {
        display.slice(0, idx === 0 ? 4 : 12).forEach(r => {
          const row = el('div', 'cso-list-item');
          const main = el('div', 'cso-list-item-main');
          main.appendChild(el('h4', 'cso-list-item-title', r.title));
          main.appendChild(el('span', 'cso-list-item-sub', `${r.exam || 'Odisha'} · ${(r.kind || 'PYQ').toUpperCase()} ${r.year || ''}`));
          if (isFallback) {
            main.appendChild(el('span', 'cso-pill-badge cso-badge-fallback', 'General Odisha Resource'));
          }
          const link = el('a', 'cso-btn cso-btn-sm', 'Download ⬇');
          link.href = r.file_url || '/resources/';
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          row.appendChild(main);
          row.appendChild(link);
          host.appendChild(row);
        });
      }

      if (isFallback || !display.length) {
        const footer = el('div', 'cso-shelf-footer');
        const browseBtn = el('a', 'cso-btn cso-btn-sm', 'Browse All Study Material →');
        browseBtn.href = '/resources/';
        footer.appendChild(browseBtn);
        host.appendChild(footer);
      }
    });
  }

  function renderBookmarksShelves() {
    const overHost = document.getElementById('candidate-jobs-shelf');
    const tabHost = document.getElementById('bookmarks-tab-jobs-shelf');
    const items = (window.CSOBookmarks && typeof window.CSOBookmarks.getAllBookmarks === 'function')
      ? window.CSOBookmarks.getAllBookmarks()
      : [];

    [overHost, tabHost].forEach((host, idx) => {
      if (!host) return;
      clear(host);
      if (!items.length) {
        host.appendChild(el('p', 'cso-muted-note', 'No bookmarks saved yet. Star any job, test, or resource across the site.'));
        return;
      }
      items.slice(0, idx === 0 ? 4 : 25).forEach(bm => {
        const row = el('div', 'cso-list-item');
        const main = el('div', 'cso-list-item-main');
        main.appendChild(el('h4', 'cso-list-item-title', bm.title || 'Saved Item'));
        main.appendChild(el('span', 'cso-list-item-sub', bm.itemType || bm.type || 'Bookmark'));
        const a = el('a', 'cso-btn cso-btn-sm', 'Open →');
        a.href = bm.url || '#';
        row.appendChild(main);
        row.appendChild(a);
        host.appendChild(row);
      });
    });
  }

  function renderAchievements(score, doneTopics, attemptCount, sprints) {
    const grid = document.getElementById('cso-achievements-grid');
    if (!grid) return;
    clear(grid);
    const cards = [
      ['🎯', `Readiness ${score}/100`, 'Combined syllabus, CBT accuracy & study cadence'],
      ['📚', `${doneTopics} Topics Mastered`, 'Auto-synced with your D1 exam checklists'],
      ['🧪', `${attemptCount} CBT Tests Logged`, 'Live server-graded mock test submissions'],
      ['⏱️', `${sprints} Focus Sprints Today`, 'Completed Pomodoro study sessions']
    ];
    cards.forEach(c => {
      const box = el('div', 'cso-ach-card');
      box.appendChild(el('div', '', c[0]));
      box.appendChild(el('h4', '', c[1]));
      box.appendChild(el('p', 'cso-muted-note', c[2]));
      grid.appendChild(box);
    });
  }

  /* ---------- Workspace Tools (Locker, Scratchpad, Timer, Calc, Drill, Search, Profile) ---------- */
  function initWorkspaceTools() {
    // Document Locker
    const lockerGrid = document.getElementById('candidate-locker-grid');
    if (lockerGrid) {
      const lockerState = readJsonStorage(LOCKER_KEY, {});
      LOCKER_ITEMS.forEach(item => {
        const row = el('label', 'cso-topic-row');
        const left = el('div', 'cso-exam-pick-label');
        const chk = document.createElement('input');
        chk.type = 'checkbox';
        chk.checked = Boolean(lockerState[item.id]);
        chk.addEventListener('change', () => {
          lockerState[item.id] = chk.checked;
          writeJsonStorage(LOCKER_KEY, lockerState);
        });
        left.appendChild(chk);
        left.appendChild(el('span', '', item.label));
        row.appendChild(left);
        lockerGrid.appendChild(row);
      });
    }

    // Scratchpad
    const pad = document.getElementById('bp-candidate-scratchpad');
    const padInd = document.getElementById('scratchpad-save-indicator');
    if (pad) {
      pad.value = localStorage.getItem(NOTES_KEY) || '';
      pad.addEventListener('input', () => {
        try { localStorage.setItem(NOTES_KEY, pad.value); } catch {}
        if (padInd) padInd.textContent = 'Saved locally';
      });
    }

    // Pomodoro Timer
    let mins = 25;
    let secsLeft = 25 * 60;
    let timerId = null;
    const disp = document.getElementById('pomodoro-display');
    const toggleBtn = document.getElementById('pomodoro-toggle-btn');
    const sprintLbl = document.getElementById('pomodoro-sessions-count');
    function drawTimer() {
      if (!disp) return;
      const m = String(Math.floor(secsLeft / 60)).padStart(2, '0');
      const s = String(secsLeft % 60).padStart(2, '0');
      disp.textContent = `${m}:${s}`;
    }
    document.querySelectorAll('#tool-study-timer [data-mins]').forEach(btn => {
      btn.addEventListener('click', () => {
        clearInterval(timerId); timerId = null;
        mins = Number(btn.dataset.mins) || 25;
        secsLeft = mins * 60;
        document.querySelectorAll('#tool-study-timer [data-mins]').forEach(b => b.classList.toggle('active', b === btn));
        if (toggleBtn) toggleBtn.textContent = '▶ Start Sprint';
        drawTimer();
      });
    });
    toggleBtn?.addEventListener('click', () => {
      if (timerId) {
        clearInterval(timerId); timerId = null;
        toggleBtn.textContent = '▶ Resume';
      } else {
        toggleBtn.textContent = '⏸ Pause';
        timerId = setInterval(() => {
          secsLeft--;
          if (secsLeft <= 0) {
            clearInterval(timerId); timerId = null;
            const cur = (Number(readJsonStorage('cso_pomodoro_sprints_today', 0)) || 0) + 1;
            writeJsonStorage('cso_pomodoro_sprints_today', cur);
            if (sprintLbl) sprintLbl.textContent = `Completed study sprints today: ${cur}`;
            toggleBtn.textContent = '▶ Start Sprint';
            secsLeft = mins * 60;
            showToast('Study sprint completed!');
            renderReadinessHero();
          }
          drawTimer();
        }, 1000);
      }
    });
    document.getElementById('pomodoro-reset-btn')?.addEventListener('click', () => {
      clearInterval(timerId); timerId = null;
      secsLeft = mins * 60;
      if (toggleBtn) toggleBtn.textContent = '▶ Start Sprint';
      drawTimer();
    });

    // Cutoff Calculator
    function updateCalc() {
      const preset = (document.getElementById('calc-exam-preset')?.value || '1,0.25').split(',').map(Number);
      const corr = Number(document.getElementById('calc-correct-count')?.value || 0);
      const wrong = Number(document.getElementById('calc-wrong-count')?.value || 0);
      const net = (corr * preset[0]) - (wrong * preset[1]);
      const out = document.getElementById('calc-net-score');
      if (out) out.textContent = net.toFixed(2);
    }
    ['calc-exam-preset', 'calc-correct-count', 'calc-wrong-count'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', updateCalc);
      document.getElementById(id)?.addEventListener('change', updateCalc);
    });
    updateCalc();

    // Daily GK Drill
    let drillIdx = 0;
    let drillScore = 0;
    function renderDrill() {
      const qEl = document.getElementById('drill-question-text');
      const optHost = document.getElementById('drill-options-container');
      const expEl = document.getElementById('drill-explanation-box');
      const nextBtn = document.getElementById('drill-next-btn');
      const badge = document.getElementById('drill-score-badge');
      if (!qEl || !optHost) return;
      if (badge) badge.textContent = `Score: ${drillScore} / ${GK_DRILL_BANK.length}`;
      const item = GK_DRILL_BANK[drillIdx];
      qEl.textContent = `Q${drillIdx + 1}. ${item.q}`;
      clear(optHost);
      if (expEl) expEl.hidden = true;
      if (nextBtn) nextBtn.hidden = true;
      item.opts.forEach((opt, i) => {
        const b = el('button', 'cso-drill-opt', opt);
        b.type = 'button';
        b.addEventListener('click', () => {
          optHost.querySelectorAll('button').forEach(btn => { btn.disabled = true; });
          if (i === item.ans) {
            b.classList.add('is-correct');
            drillScore++;
          } else {
            b.classList.add('is-wrong');
            optHost.children[item.ans]?.classList.add('is-correct');
          }
          if (badge) badge.textContent = `Score: ${drillScore} / ${GK_DRILL_BANK.length}`;
          if (expEl) { expEl.textContent = item.exp; expEl.hidden = false; }
          if (nextBtn) nextBtn.hidden = false;
        });
        optHost.appendChild(b);
      });
    }
    document.getElementById('drill-next-btn')?.addEventListener('click', () => {
      drillIdx = (drillIdx + 1) % GK_DRILL_BANK.length;
      if (drillIdx === 0) drillScore = 0;
      renderDrill();
    });
    renderDrill();

    // Universal Search (Ctrl+K)
    const overlay = document.getElementById('bp-search-overlay');
    const searchInp = document.getElementById('bp-search-modal-input');
    const searchRes = document.getElementById('bp-search-modal-results');
    function openSearch() { if (overlay) { overlay.hidden = false; searchInp?.focus(); } }
    document.getElementById('bp-topbar-search-trigger')?.addEventListener('click', openSearch);
    document.getElementById('tool-search-btn')?.addEventListener('click', (e) => { e.preventDefault(); openSearch(); });
    document.getElementById('bp-search-modal-close')?.addEventListener('click', () => { if (overlay) overlay.hidden = true; });
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openSearch(); }
      if (e.key === 'Escape' && overlay && !overlay.hidden) overlay.hidden = true;
    });
    searchInp?.addEventListener('input', () => {
      if (!searchRes) return;
      clear(searchRes);
      const q = searchInp.value.trim().toLowerCase();
      if (!q) {
        searchRes.appendChild(el('p', 'cso-muted-note', 'Type to search across 44 exams and syllabus topics...'));
        return;
      }
      const hits = state.taxonomy.filter(ex => (ex.exam_label + ' ' + ex.short_code + ' ' + ex.track_label).toLowerCase().includes(q)).slice(0, 8);
      if (!hits.length) {
        searchRes.appendChild(el('p', 'cso-muted-note', 'No exams found matching "' + q + '".'));
        return;
      }
      hits.forEach(ex => {
        const row = el('div', 'cso-list-item');
        const main = el('div', 'cso-list-item-main');
        main.appendChild(el('h4', 'cso-list-item-title', ex.exam_label));
        main.appendChild(el('span', 'cso-list-item-sub', `${ex.domain_label} · ${ex.track_label}`));
        const btn = el('button', 'cso-btn cso-btn-sm', 'View Syllabus');
        btn.type = 'button';
        btn.addEventListener('click', () => {
          state.activeChecklistExam = ex.id;
          if (!state.preferences.selectedExams.includes(ex.id) && !state.controls.lock_exam_preferences) {
            state.allFeedMode = true;
          }
          if (overlay) overlay.hidden = true;
          switchTab('tab-my-learning');
          renderChecklistTracker();
        });
        row.appendChild(main);
        row.appendChild(btn);
        searchRes.appendChild(row);
      });
    });

    // Profile Editor Modal
    const distSel = document.getElementById('edit-candidate-district');
    if (distSel) {
      ODISHA_DISTRICTS.forEach(d => {
        const opt = el('option', '', d);
        opt.value = d;
        distSel.appendChild(opt);
      });
    }
    const pModal = document.getElementById('cso-profile-modal');
    document.getElementById('btn-open-profile-editor-tab')?.addEventListener('click', () => {
      if (!pModal) return;
      document.getElementById('edit-candidate-name').value = state.user?.fullName || '';
      document.getElementById('edit-candidate-mobile').value = state.user?.phone || '';
      if (distSel && state.user?.district) distSel.value = state.user.district;
      pModal.hidden = false;
    });
    document.getElementById('cso-profile-modal-close')?.addEventListener('click', () => { if (pModal) pModal.hidden = true; });
    document.getElementById('cso-profile-cancel-btn')?.addEventListener('click', () => { if (pModal) pModal.hidden = true; });
    document.getElementById('cso-profile-editor-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fullName = document.getElementById('edit-candidate-name').value.trim();
      const phone = document.getElementById('edit-candidate-mobile').value.trim();
      const district = document.getElementById('edit-candidate-district').value;
      const saveBtn = document.getElementById('cso-profile-save-btn');
      if (saveBtn) saveBtn.disabled = true;
      try {
        const res = await fetch('/api/user/profile', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', 'X-CSO-CSRF': '1' },
          body: JSON.stringify({ fullName, phone, district, targetExams: state.preferences.selectedExams })
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error || 'Failed to update profile');
        }
        state.user = { ...(state.user || {}), fullName, name: fullName, phone, district };
        writeJsonStorage(SESSION_KEY, { ...(readJsonStorage(SESSION_KEY, {})), ...state.user });
        renderProfileAndControls();
        if (pModal) pModal.hidden = true;
        showToast('Profile saved to D1!');
      } catch (err) {
        showToast(err.message || 'Profile update failed', true);
      } finally {
        if (saveBtn) saveBtn.disabled = false;
      }
    });

    // JSON Backup Export
    document.getElementById('btn-export-json-backup')?.addEventListener('click', () => {
      const payload = {
        exportedAt: new Date().toISOString(),
        preferences: state.preferences,
        checklists: getSavedChecklists(),
        mistakes: readJsonStorage(MISTAKES_KEY, []),
        locker: readJsonStorage(LOCKER_KEY, {}),
        notes: localStorage.getItem(NOTES_KEY) || ''
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cso-workspace-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  function renderAllPersonalizedViews() {
    renderProfileAndControls();
    renderFocusBar();
    renderReadinessHero();
    renderTargetExamCards();
    renderPriorityTopics();
    renderChecklistTracker();
    renderCountdownsAndCalendar();
    renderCbtAnalytics();
    renderSchemes();
    renderResourcesShelf();
    renderBookmarksShelves();
  }

  /* ---------- Bootstrap & Data Hydration ---------- */
  async function bootstrap() {
    initThemeSwitcher();
    initNavigation();
    initMistakeNotebook();
    initManualScoreLogger();
    initWorkspaceTools();

    document.getElementById('cso-profile-signout-btn')?.addEventListener('click', performSignOut);
    document.getElementById('cso-open-goal-modal-btn')?.addEventListener('click', openGoalModal);
    document.getElementById('btn-open-goals-settings')?.addEventListener('click', openGoalModal);
    document.getElementById('cso-goal-modal-close')?.addEventListener('click', () => { document.getElementById('cso-goal-modal').hidden = true; });
    document.getElementById('cso-goal-cancel-btn')?.addEventListener('click', () => { document.getElementById('cso-goal-modal').hidden = true; });
    document.getElementById('cso-goal-save-btn')?.addEventListener('click', saveGoalModal);
    document.getElementById('cso-goal-search-input')?.addEventListener('input', (e) => renderGoalModalTiers(e.target.value));
    document.getElementById('cso-all-feed-toggle')?.addEventListener('click', () => {
      state.allFeedMode = !state.allFeedMode;
      renderAllPersonalizedViews();
    });
    document.getElementById('bp-notif-btn')?.addEventListener('click', () => {
      if (state.controls.admin_notice_text) {
        showToast(state.controls.admin_notice_text);
      } else {
        showToast('All exam deadlines & D1 alerts are up to date.');
      }
    });

    window.addEventListener('cso:bookmarks-updated', renderBookmarksShelves);

    // 1. Auth & Controls Handshake
    try {
      const meRes = await fetch('/api/auth/me', { credentials: 'include' });
      if (meRes.status === 401 || meRes.status === 403) {
        const errData = await meRes.json().catch(() => ({}));
        if (errData.code === 'ACCOUNT_RESTRICTED') {
          state.controls.account_status = errData.account_status || 'suspended';
          state.controls.admin_notice_text = errData.error || 'Your account has been restricted by an administrator.';
          state.controls.admin_notice_level = 'urgent';
          renderProfileAndControls();
          return;
        }
        window.location.replace('/login.html?redirect=' + encodeURIComponent(window.location.pathname));
        return;
      }
      const meData = await meRes.json();
      if (meData && meData.user) {
        state.user = meData.user;
        if (meData.controls) state.controls = meData.controls;
        if (meData.preferences && Array.isArray(meData.preferences.selectedExams) && meData.preferences.selectedExams.length) {
          state.preferences = meData.preferences;
          writeJsonStorage(PREFS_KEY, meData.preferences);
        } else {
          const localPrefs = readJsonStorage(PREFS_KEY, null);
          if (localPrefs && Array.isArray(localPrefs.selectedExams) && localPrefs.selectedExams.length) {
            state.preferences = localPrefs;
          }
        }
        writeJsonStorage(SESSION_KEY, { ...meData.user, isAuthenticated: true });
      }
    } catch {
      state.user = readJsonStorage(SESSION_KEY, { fullName: 'Odisha Aspirant', district: 'Odisha' });
    }

    // 2. Fetch 4-Tier Exam Taxonomy (with IndexedDB offline fallback)
    try {
      const taxRes = await fetch('/api/content/exam-taxonomy');
      if (taxRes.ok) {
        const taxData = await taxRes.json();
        state.taxonomy = taxData.items || [];
        if (window.CSOIdb && typeof window.CSOIdb.putTaxonomy === 'function') {
          window.CSOIdb.putTaxonomy(state.taxonomy).catch(() => {});
        }
      }
    } catch {
      if (window.CSOIdb && typeof window.CSOIdb.getTaxonomy === 'function') {
        state.taxonomy = await window.CSOIdb.getTaxonomy().catch(() => []);
      }
    }

    // 3. Fetch Live D1 CBT Attempts, Schemes, Resources in parallel
    const [attRes, schRes, resRes] = await Promise.all([
      fetch('/api/user/attempts', { credentials: 'include' }).then(r => r.ok ? r.json() : { items: [] }).catch(() => ({ items: [] })),
      fetch('/api/content/schemes').then(r => r.ok ? r.json() : { items: [] }).catch(() => ({ items: [] })),
      fetch('/api/content/resources?limit=30').then(r => r.ok ? r.json() : { items: [] }).catch(() => ({ items: [] }))
    ]);
    state.attempts = attRes.items || [];
    state.schemes = schRes.items || [];
    state.resources = resRes.items || [];

    if (window.CSOSync && typeof window.CSOSync.reconcileChecklist === 'function') {
      window.CSOSync.reconcileChecklist().catch(() => {});
    }

    renderAllPersonalizedViews();
  }

  document.addEventListener('DOMContentLoaded', bootstrap);
})();
