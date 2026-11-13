/* CSO Global Enhancements: Bilingual Sync, Accessibility Modes, Ctrl+K Unified D1 Search, Community Feedback Modal (Strict CSP) */
(() => {
  'use strict';

  const A11Y_KEY = 'cso_a11y_prefs';
  const LANG_KEY = 'cso_lang_pref';

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = String(text);
    return n;
  }

  function loadA11y() {
    try {
      const p = JSON.parse(localStorage.getItem(A11Y_KEY) || '{}');
      return {
        dyslexia: Boolean(p.dyslexia),
        contrast: Boolean(p.contrast),
        lite: Boolean(p.lite)
      };
    } catch {
      return { dyslexia: false, contrast: false, lite: false };
    }
  }

  function applyA11y(prefs) {
    const p = prefs || loadA11y();
    const root = document.documentElement;
    root.classList.toggle('cso-a11y-dyslexia', Boolean(p.dyslexia));
    root.classList.toggle('cso-a11y-contrast', Boolean(p.contrast));
    root.classList.toggle('cso-a11y-lite', Boolean(p.lite));
  }

  function saveA11y(prefs) {
    try { localStorage.setItem(A11Y_KEY, JSON.stringify(prefs)); } catch {}
    applyA11y(prefs);
  }

  function toggleA11y(mode) {
    const p = loadA11y();
    if (mode in p) p[mode] = !p[mode];
    saveA11y(p);
    return p[mode];
  }

  function resetA11y() {
    saveA11y({ dyslexia: false, contrast: false, lite: false });
  }

  function syncLang(lang) {
    const code = (lang === 'or' || lang === 'hi' || lang === 'en') ? lang : 'en';
    document.documentElement.lang = code;
    document.documentElement.dataset.lang = code;
    try {
      localStorage.setItem(LANG_KEY, code);
      const raw = JSON.parse(localStorage.getItem('cso') || '{}');
      if (raw && typeof raw === 'object') {
        raw.lang = code;
        localStorage.setItem('cso', JSON.stringify(raw));
      }
    } catch {}
    window.dispatchEvent(new CustomEvent('cso:lang-change', { detail: { lang: code } }));
  }

  function getLang() {
    try {
      const direct = localStorage.getItem(LANG_KEY);
      if (direct === 'or' || direct === 'hi' || direct === 'en') return direct;
      const raw = JSON.parse(localStorage.getItem('cso') || '{}');
      if (raw && (raw.lang === 'or' || raw.lang === 'hi' || raw.lang === 'en')) return raw.lang;
    } catch {}
    return document.documentElement.lang || 'en';
  }

  function syncA11yFromApp() {
    try {
      const raw = JSON.parse(localStorage.getItem('cso') || '{}');
      if (raw && typeof raw === 'object') {
        const p = loadA11y();
        p.contrast = Boolean(raw.hc || p.contrast);
        applyA11y(p);
      }
    } catch {}
  }

  // ---- Global Ctrl+K Unified D1 Search Modal ----
  let searchBackdrop = null;
  let searchInput = null;
  let searchCountsEl = null;
  let searchResultsEl = null;
  let activeSearchFilter = '';
  let searchTimer = null;

  function ensureSearchModal() {
    if (searchBackdrop) return searchBackdrop;
    searchBackdrop = el('div', 'cso-modal-backdrop');
    searchBackdrop.id = 'cso-global-search-backdrop';
    searchBackdrop.hidden = true;

    const panel = el('div', 'cso-modal-panel');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'cso-gsearch-title');

    const head = el('div', 'cso-modal-head');
    const title = el('h2', 'cso-modal-title', '🔍 Search Odisha Jobs, Schemes, Tests & Resources');
    title.id = 'cso-gsearch-title';
    const closeBtn = el('button', 'cso-modal-close', '×');
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Close search');
    closeBtn.addEventListener('click', closeSearchModal);
    head.append(title, closeBtn);

    searchInput = el('input', 'cso-gsearch-input');
    searchInput.type = 'search';
    searchInput.id = 'cso-global-search-input';
    searchInput.placeholder = 'Search OPSC OAS, Subhadra Yojana, OSSC CGL, OSSSC, syllabus… (Ctrl+K)';
    searchInput.setAttribute('aria-label', 'Search across Common Sense Odisha database');
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => runD1Search(searchInput.value.trim()), 180);
    });

    searchCountsEl = el('div', 'cso-gsearch-counts');
    searchResultsEl = el('div', 'cso-gsearch-results');
    searchResultsEl.setAttribute('role', 'region');
    searchResultsEl.setAttribute('aria-live', 'polite');

    panel.append(head, searchInput, searchCountsEl, searchResultsEl);
    searchBackdrop.appendChild(panel);
    searchBackdrop.addEventListener('click', (e) => {
      if (e.target === searchBackdrop) closeSearchModal();
    });
    document.body.appendChild(searchBackdrop);
    return searchBackdrop;
  }

  async function runD1Search(q) {
    if (!searchResultsEl || !searchCountsEl) return;
    if (!q || q.length < 2) {
      searchCountsEl.replaceChildren();
      searchResultsEl.replaceChildren(
        el('p', 'cso-muted-note', 'Type at least 2 characters to search live Jobs, Schemes, Current Affairs, Mock Tests, Syllabus PDFs, and Exams.')
      );
      return;
    }

    searchResultsEl.replaceChildren(el('p', 'cso-muted-note', 'Searching Common Sense Odisha live database…'));
    try {
      const params = new URLSearchParams({ q, limit: '16' });
      if (activeSearchFilter) params.set('type', activeSearchFilter);
      const res = await fetch(`/api/content/search?${params.toString()}`, { credentials: 'same-origin' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      searchCountsEl.replaceChildren();
      const filterDefs = [
        ['', 'All', data.total || 0],
        ['job', 'Jobs', data.counts?.jobs || 0],
        ['scheme', 'Schemes', data.counts?.schemes || 0],
        ['mock_test', 'Mock Tests', data.counts?.mock_tests || 0],
        ['resource', 'Resources', data.counts?.resources || 0],
        ['current_affair', 'Updates', data.counts?.current_affairs || 0],
        ['directory', 'Directory', data.counts?.directory || 0]
      ];
      filterDefs.forEach(([key, label, cnt]) => {
        if (key && !cnt) return;
        const btn = el('button', 'cso-gsearch-chip' + (activeSearchFilter === key ? ' is-active' : ''), `${label} (${cnt})`);
        btn.type = 'button';
        btn.addEventListener('click', () => {
          activeSearchFilter = key;
          runD1Search(q);
        });
        searchCountsEl.appendChild(btn);
      });

      const items = Array.isArray(data.items) ? data.items : [];
      searchResultsEl.replaceChildren();
      if (!items.length) {
        searchResultsEl.appendChild(el('p', 'cso-muted-note', `No live matches found for "${q}".`));
        return;
      }

      const frag = document.createDocumentFragment();
      items.forEach((item) => {
        const a = el('a', 'cso-gsearch-item');
        a.href = item.url || '/';
        const copy = el('div');
        copy.appendChild(el('strong', '', item.title || 'Untitled'));
        if (item.title_or && getLang() === 'or') {
          copy.appendChild(el('div', 'cso-muted-note', item.title_or));
        }
        if (item.subtitle) {
          copy.appendChild(el('div', 'cso-muted-note', item.subtitle));
        }
        const badge = el('span', 'cso-gsearch-badge', item.badge || item.type);
        a.append(copy, badge);
        a.addEventListener('click', () => closeSearchModal());
        frag.appendChild(a);
      });
      searchResultsEl.appendChild(frag);
    } catch {
      searchResultsEl.replaceChildren(el('p', 'cso-muted-note', 'Search is temporarily unavailable. Please try again.'));
    }
  }

  function openSearchModal(initialQuery) {
    const bd = ensureSearchModal();
    activeSearchFilter = '';
    bd.hidden = false;
    if (searchInput) {
      if (typeof initialQuery === 'string' && initialQuery) searchInput.value = initialQuery;
      searchInput.focus();
      runD1Search(searchInput.value.trim());
    }
  }

  function closeSearchModal() {
    if (searchBackdrop) searchBackdrop.hidden = true;
  }

  // ---- Community Feedback Modal ("Report an Error" / "Suggest Resource") ----
  let fbBackdrop = null;
  let fbKindEl = null;
  let fbSubjectEl = null;
  let fbDetailsEl = null;
  let fbEmailEl = null;
  let fbStatusEl = null;

  function ensureFeedbackModal() {
    if (fbBackdrop) return fbBackdrop;
    fbBackdrop = el('div', 'cso-modal-backdrop');
    fbBackdrop.id = 'cso-feedback-backdrop';
    fbBackdrop.hidden = true;

    const panel = el('div', 'cso-modal-panel');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'cso-fb-title');

    const head = el('div', 'cso-modal-head');
    const title = el('h2', 'cso-modal-title', '📝 Report an Error or Suggest Resource');
    title.id = 'cso-fb-title';
    const closeBtn = el('button', 'cso-modal-close', '×');
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Close feedback form');
    closeBtn.addEventListener('click', () => { fbBackdrop.hidden = true; });
    head.append(title, closeBtn);

    const form = el('form', 'cso-feedback-form');
    const lblKind = el('label', '', 'Type of Submission');
    fbKindEl = el('select');
    [['error', 'Report a Content Error / Typo'], ['broken_link', 'Report a Broken Official Link'], ['outdated', 'Flag Outdated Date / Circular'], ['suggestion', 'Suggest a New Exam / Scheme / Resource']].forEach(([val, txt]) => {
      const o = el('option', '', txt);
      o.value = val;
      fbKindEl.appendChild(o);
    });
    lblKind.appendChild(fbKindEl);

    const lblSubj = el('label', '', 'Subject / Notification Name');
    fbSubjectEl = el('input');
    fbSubjectEl.type = 'text';
    fbSubjectEl.required = true;
    fbSubjectEl.maxLength = 160;
    fbSubjectEl.placeholder = 'e.g. OPSC OAS Last Date correction / Add B.Ed PYQ';
    lblSubj.appendChild(fbSubjectEl);

    const lblDet = el('label', '', 'Details');
    fbDetailsEl = el('textarea');
    fbDetailsEl.rows = 4;
    fbDetailsEl.required = true;
    fbDetailsEl.maxLength = 2000;
    fbDetailsEl.placeholder = 'Describe the exact error or official resource link to add…';
    lblDet.appendChild(fbDetailsEl);

    const lblEmail = el('label', '', 'Optional Email (for resolution update)');
    fbEmailEl = el('input');
    fbEmailEl.type = 'email';
    fbEmailEl.maxLength = 120;
    fbEmailEl.placeholder = 'you@example.com';
    lblEmail.appendChild(fbEmailEl);

    fbStatusEl = el('p', '', '');
    fbStatusEl.setAttribute('role', 'status');
    fbStatusEl.setAttribute('aria-live', 'polite');

    const row = el('div', 'cso-feedback-btn-row');
    const subBtn = el('button', 'cso-btn-forest', 'Submit Feedback');
    subBtn.type = 'submit';
    const cancelBtn = el('button', 'cso-modal-close', 'Cancel');
    cancelBtn.type = 'button';
    cancelBtn.addEventListener('click', () => { fbBackdrop.hidden = true; });
    row.append(subBtn, cancelBtn);

    form.append(lblKind, lblSubj, lblDet, lblEmail, fbStatusEl, row);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      fbStatusEl.textContent = 'Submitting…';
      try {
        const res = await fetch('/api/content/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({
            kind: fbKindEl.value,
            subject: fbSubjectEl.value.trim(),
            details: fbDetailsEl.value.trim(),
            contact_email: fbEmailEl.value.trim() || undefined,
            page_url: window.location.pathname + window.location.search,
            page_title: document.title
          })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        fbStatusEl.textContent = '✓ ' + (data.message || 'Thank you! Your report is queued for editorial review.');
        fbSubjectEl.value = '';
        fbDetailsEl.value = '';
        setTimeout(() => { if (fbBackdrop) fbBackdrop.hidden = true; }, 1600);
      } catch (err) {
        fbStatusEl.textContent = '⚠️ ' + (err.message || 'Unable to submit feedback right now.');
      }
    });

    panel.append(head, form);
    fbBackdrop.appendChild(panel);
    fbBackdrop.addEventListener('click', (e) => {
      if (e.target === fbBackdrop) fbBackdrop.hidden = true;
    });
    document.body.appendChild(fbBackdrop);
    return fbBackdrop;
  }

  function openFeedbackModal(defaultKind) {
    const bd = ensureFeedbackModal();
    if (fbKindEl && defaultKind) fbKindEl.value = defaultKind;
    if (fbStatusEl) fbStatusEl.textContent = '';
    bd.hidden = false;
    if (fbSubjectEl) fbSubjectEl.focus();
  }

  // Global keyboard shortcuts & footer link delegation
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openSearchModal('');
      return;
    }
    if (e.key === 'Escape') {
      if (searchBackdrop && !searchBackdrop.hidden) closeSearchModal();
      if (fbBackdrop && !fbBackdrop.hidden) fbBackdrop.hidden = true;
    }
  });

  document.addEventListener('click', (e) => {
    const repLink = e.target.closest('a[href*="report-error"], [data-cso-feedback="error"]');
    if (repLink) {
      e.preventDefault();
      openFeedbackModal('error');
      return;
    }
    const sugLink = e.target.closest('a[href*="suggest-resource"], [data-cso-feedback="suggestion"]');
    if (sugLink) {
      e.preventDefault();
      openFeedbackModal('suggestion');
      return;
    }
    const searchBtn = e.target.closest('[data-cso-open-search]');
    if (searchBtn) {
      e.preventDefault();
      openSearchModal('');
    }
  });

  function init() {
    applyA11y();
    syncLang(getLang());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.CSOGlobal = {
    openSearch: openSearchModal,
    closeSearch: closeSearchModal,
    openFeedback: openFeedbackModal,
    toggleA11y,
    resetA11y,
    loadA11y,
    syncA11yFromApp,
    syncLang,
    getLang
  };
})();
