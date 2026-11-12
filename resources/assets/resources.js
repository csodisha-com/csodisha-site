/**
 * Common Sense Odisha (CSO) — Public Syllabus & PYQ Resources Controller
 * Fetches published documents from GET /api/content/resources.
 * Strict CSP-compliant, safe DOM rendering using textContent.
 */
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const pc = window.CSOPublicContent;
  const el = pc ? pc.el : (t, c, tx) => {
    const n = document.createElement(t);
    if (c) n.className = c;
    if (tx !== undefined && tx !== null) n.textContent = String(tx);
    return n;
  };

  const searchInput = $('res-search');
  const searchClearBtn = $('res-search-clear');
  const kindsBar = $('res-kinds');
  const examSelect = $('res-exam-select');
  const countLabel = $('res-count-label');
  const resetBtn = $('res-reset-btn');
  const statusEl = $('res-status');
  const gridEl = $('res-grid');
  const paginationEl = $('res-pagination');

  const knownExams = new Set(['OPSC', 'OSSC', 'OSSSC', 'OTET', 'OSSTET', 'CTET', 'OAVS']);
  let state = {
    page: 1,
    limit: 12,
    kind: '',
    exam: '',
    q: ''
  };
  let searchTimer = null;

  function syncExamOptions(items) {
    if (!examSelect) return;
    let added = false;
    (items || []).forEach(item => {
      if (item.exam && !knownExams.has(item.exam)) {
        knownExams.add(item.exam);
        added = true;
      }
    });
    if (added) {
      const current = examSelect.value;
      examSelect.replaceChildren(el('option', '', 'All Examinations'));
      examSelect.options[0].value = '';
      Array.from(knownExams).sort().forEach(ex => {
        const opt = el('option', '', ex);
        opt.value = ex;
        examSelect.appendChild(opt);
      });
      examSelect.value = current;
    }
  }

  function updateKindChipsUI() {
    if (!kindsBar) return;
    kindsBar.querySelectorAll('.pc-chip').forEach(btn => {
      const active = (btn.dataset.kind || '') === state.kind;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
  }

  function renderResourceCard(item) {
    const card = el('article', 'pc-card');
    const top = el('div');

    const badges = el('div', 'pc-badges');
    const isPyq = item.kind === 'pyq';
    badges.appendChild(el('span', isPyq ? 'pc-badge pc-badge--amber' : 'pc-badge pc-badge--green', isPyq ? '📄 PYQ Paper' : '📋 Official Syllabus'));
    if (item.exam) {
      badges.appendChild(el('span', 'pc-badge', item.exam));
    }
    if (item.year) {
      badges.appendChild(el('span', 'pc-badge', String(item.year)));
    }
    top.appendChild(badges);

    top.appendChild(el('h2', 'pc-card__title', item.title || 'Untitled Document'));
    if (item.description) {
      top.appendChild(el('p', 'pc-card__summary', item.description));
    }

    const specs = el('div', 'pc-card__specs');
    if (item.published_at && pc) {
      specs.appendChild(el('span', '', `📅 Added: ${pc.formatDate(item.published_at)}`));
    }
    top.appendChild(specs);
    card.appendChild(top);

    const footer = el('div', 'pc-card__footer');
    if (item.file_url && pc && pc.safeMediaSrc(item.file_url)) {
      const dlLink = el('a', 'pc-btn pc-btn--primary', '📥 View / Download PDF');
      dlLink.href = item.file_url;
      dlLink.target = '_blank';
      dlLink.rel = 'noopener noreferrer';
      footer.appendChild(dlLink);
    }

    if (pc && typeof pc.createBookmarkButton === 'function') {
      footer.appendChild(pc.createBookmarkButton({
        type: 'study',
        id: `res-${item.id}`,
        title: item.title,
        badge: isPyq ? `PYQ${item.exam ? ' · ' + item.exam : ''}` : `Syllabus${item.exam ? ' · ' + item.exam : ''}`,
        url: '/resources/',
        pdfUrl: item.file_url || ''
      }));
    }

    card.appendChild(footer);
    return card;
  }

  function renderPagination(page, limit, total) {
    if (!paginationEl) return;
    paginationEl.replaceChildren();
    const totalPages = Math.ceil((total || 0) / (limit || 12));
    if (totalPages <= 1) {
      paginationEl.hidden = true;
      return;
    }
    paginationEl.hidden = false;

    const prev = el('button', 'pc-btn', '← Previous');
    prev.type = 'button';
    prev.disabled = page <= 1;
    prev.addEventListener('click', () => {
      if (state.page > 1) {
        state.page--;
        loadResources();
      }
    });

    const info = el('span', 'pc-badge', `Page ${page} of ${totalPages}`);

    const next = el('button', 'pc-btn', 'Next →');
    next.type = 'button';
    next.disabled = page >= totalPages;
    next.addEventListener('click', () => {
      if (state.page < totalPages) {
        state.page++;
        loadResources();
      }
    });

    paginationEl.append(prev, info, next);
  }

  async function loadResources() {
    if (!gridEl || !statusEl) return;
    const hasFilter = Boolean(state.kind || state.exam || state.q);
    if (resetBtn) resetBtn.hidden = !hasFilter;
    if (searchClearBtn) searchClearBtn.hidden = !state.q;

    statusEl.hidden = false;
    statusEl.replaceChildren(
      el('h3', '', 'Loading Syllabus & PYQ Repository…'),
      el('p', '', 'Fetching verified documents from Common Sense Odisha.')
    );
    gridEl.replaceChildren();

    const params = new URLSearchParams();
    params.set('page', String(state.page));
    params.set('limit', String(state.limit));
    if (state.kind) params.set('kind', state.kind);
    if (state.exam) params.set('exam', state.exam);
    if (state.q) params.set('q', state.q);

    try {
      const res = await fetch(`/api/content/resources?${params.toString()}`, { credentials: 'same-origin' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const items = Array.isArray(data.items) ? data.items : [];
      const total = Number(data.total) || items.length;

      syncExamOptions(items);

      if (countLabel) {
        countLabel.textContent = `${total.toLocaleString('en-IN')} published ${total === 1 ? 'document' : 'documents'}`;
      }

      if (items.length === 0) {
        statusEl.hidden = false;
        statusEl.replaceChildren(
          el('h3', '', hasFilter ? 'No matching documents found' : 'No syllabus or PYQ documents published yet'),
          el('p', '', hasFilter
            ? 'Try clearing your search or selecting All Resources / All Examinations.'
            : 'Official exam syllabi and previous year papers uploaded in the Admin Suite will appear here automatically.')
        );
        if (paginationEl) paginationEl.hidden = true;
        return;
      }

      statusEl.hidden = true;
      const frag = document.createDocumentFragment();
      items.forEach(item => frag.appendChild(renderResourceCard(item)));
      gridEl.appendChild(frag);
      renderPagination(data.page || state.page, data.limit || state.limit, total);

      if (window.CSOBookmarks && typeof window.CSOBookmarks.updateUI === 'function') {
        window.CSOBookmarks.updateUI();
      }
    } catch (err) {
      if (countLabel) countLabel.textContent = 'Repository unavailable';
      statusEl.hidden = false;
      const retry = el('button', 'pc-btn pc-btn--primary', 'Retry');
      retry.type = 'button';
      retry.addEventListener('click', loadResources);
      statusEl.replaceChildren(
        el('h3', '', 'Unable to load resources'),
        el('p', '', 'Please check your connection and try again.'),
        retry
      );
    }
  }

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        state.q = searchInput.value.trim();
        state.page = 1;
        loadResources();
      }, 220);
    });
  }

  if (searchClearBtn) {
    searchClearBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      state.q = '';
      state.page = 1;
      loadResources();
    });
  }

  if (kindsBar) {
    kindsBar.addEventListener('click', e => {
      const btn = e.target.closest('.pc-chip');
      if (!btn) return;
      state.kind = btn.dataset.kind || '';
      state.page = 1;
      updateKindChipsUI();
      loadResources();
    });
  }

  if (examSelect) {
    examSelect.addEventListener('change', () => {
      state.exam = examSelect.value;
      state.page = 1;
      loadResources();
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      state = { page: 1, limit: 12, kind: '', exam: '', q: '' };
      if (searchInput) searchInput.value = '';
      if (examSelect) examSelect.value = '';
      updateKindChipsUI();
      loadResources();
    });
  }

  const initialParams = new URLSearchParams(window.location.search);
  const initialKind = initialParams.get('kind');
  const initialExam = initialParams.get('exam');
  const initialQ = initialParams.get('q');
  if (initialKind === 'syllabus' || initialKind === 'pyq') {
    state.kind = initialKind;
    updateKindChipsUI();
  }
  if (initialExam) {
    syncExamOptions([{ exam: initialExam }]);
    state.exam = initialExam;
    if (examSelect) examSelect.value = initialExam;
  }
  if (initialQ) {
    state.q = initialQ;
    if (searchInput) searchInput.value = initialQ;
  }

  loadResources();
})();
