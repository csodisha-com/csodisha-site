/**
 * Common Sense Odisha — Interactive Study Materials, PYQ Vault & Offline Save Hub UI (v375)
 * Powers /study-materials/ from GET /api/public/study-hub.
 * Strict CSP-compliant: DOM APIs only (document.createElement / textContent / addEventListener).
 * Zero inline handlers, zero inline styles, bilingual EN / ଓଡ଼ିଆ, 4-theme semantic tokens.
 */
(function (window, document) {
  'use strict';

  var HUB_ID = 'cso-study-hub-root';
  var OFFLINE_STUDY_CACHE = 'cso-offline-study-v1';
  var STORAGE_KEY = 'cso_offline_study_ids';

  var state = {
    lang: 'en',
    allItems: [],
    savedIds: {},
    summary: { total_resources: 7, pyq_count: 2, bilingual_count: 6 },
    filters: { q: '', format: 'all', exam: 'all', subject: 'all', language: 'all' }
  };

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null && text !== '') n.textContent = String(text);
    return n;
  }

  function isOdia() {
    if (state.lang === 'or') return true;
    var root = document.documentElement;
    return Boolean(root && (root.getAttribute('lang') === 'or' || root.getAttribute('data-cso-lang') === 'or'));
  }

  function loadSavedShelf() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      var map = {};
      if (Array.isArray(arr)) {
        arr.forEach(function (id) { if (id) map[String(id)] = true; });
      }
      state.savedIds = map;
    } catch (_) {
      state.savedIds = {};
    }
  }

  function persistSavedShelf() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.keys(state.savedIds)));
    } catch (_) {}
    updateOfflineCount();
  }

  function updateOfflineCount() {
    var root = document.getElementById(HUB_ID);
    if (!root) return;
    var node = root.querySelector('[data-sm-kpi="offline"]');
    if (node) node.textContent = Object.keys(state.savedIds).length.toLocaleString('en-IN');
  }

  function toggleSaveOffline(item) {
    var id = String(item.id || '');
    if (!id) return;
    var targetUrl = item.pdf_url || item.detail_url || '/study-materials/';
    var already = Boolean(state.savedIds[id]);

    if (already) {
      delete state.savedIds[id];
      persistSavedShelf();
      if (window.caches && typeof window.caches.open === 'function') {
        window.caches.open(OFFLINE_STUDY_CACHE).then(function (c) { return c.delete(targetUrl); }).catch(function () {});
      }
      renderGrid();
      return;
    }

    state.savedIds[id] = true;
    persistSavedShelf();
    if (window.caches && typeof window.caches.open === 'function' && targetUrl.indexOf('/') === 0) {
      window.caches.open(OFFLINE_STUDY_CACHE).then(function (c) { return c.add(targetUrl); }).catch(function () {});
    }
    renderGrid();
  }

  function updateSummary(summary) {
    var root = document.getElementById(HUB_ID);
    if (!root || !summary) return;
    var map = {
      total: Number(summary.total_resources || 0),
      pyq: Number(summary.pyq_count || 0),
      bilingual: Number(summary.bilingual_count || 0)
    };
    Object.keys(map).forEach(function (k) {
      var node = root.querySelector('[data-sm-kpi="' + k + '"]');
      if (node) node.textContent = map[k].toLocaleString('en-IN');
    });
    updateOfflineCount();
  }

  function matchesFilters(it) {
    var f = state.filters;
    if (f.q) {
      var hay = [it.title_en, it.title_or, it.exam_tag, it.subject, it.resource_type, it.year].join(' ').toLowerCase();
      if (hay.indexOf(f.q.toLowerCase()) === -1) return false;
    }
    if (f.format !== 'all' && it.format_tab !== f.format) return false;
    if (f.exam !== 'all' && it.exam_key !== f.exam) return false;
    if (f.subject !== 'all' && it.subject_key !== f.subject) return false;
    if (f.language !== 'all' && it.language_key !== f.language) return false;
    return true;
  }

  function buildCard(it) {
    var orMode = isOdia();
    var isSaved = Boolean(state.savedIds[it.id]);
    var card = el('article', 'cso-sm-card');

    var top = el('div', 'cso-sm-card__top');
    var badges = el('div', 'cso-sm-card__badges');
    badges.appendChild(el('span', 'cso-sm-type-badge', it.resource_type || 'Study Notes'));
    badges.appendChild(el('span', 'cso-sm-fmt-badge', it.file_format || 'PDF'));
    if (it.language_key === 'bilingual') {
      badges.appendChild(el('span', 'cso-sm-bi-badge', 'EN + ଓଡ଼ିଆ'));
    }
    top.appendChild(badges);
    if (it.year) top.appendChild(el('span', 'cso-sm-year-badge', it.year));
    card.appendChild(top);

    var primaryTitle = (orMode && it.title_or) ? it.title_or : it.title_en;
    var secondaryTitle = (orMode && it.title_or) ? it.title_en : (it.title_or || '');
    var h3 = el('h3', 'cso-sm-card__title');
    var titleA = el('a', 'cso-sm-card__link', primaryTitle);
    titleA.setAttribute('href', it.pdf_url || it.detail_url || '/study-library/');
    h3.appendChild(titleA);
    card.appendChild(h3);

    if (secondaryTitle) card.appendChild(el('p', 'cso-sm-card__bi', secondaryTitle));

    var pills = el('div', 'cso-sm-card__pills');
    if (it.exam_tag) pills.appendChild(el('span', 'cso-sm-pill cso-sm-pill--exam', '🎯 ' + it.exam_tag));
    if (it.subject) pills.appendChild(el('span', 'cso-sm-pill', '📚 ' + it.subject));
    if (it.page_or_question_count) pills.appendChild(el('span', 'cso-sm-pill', '📄 ' + it.page_or_question_count));
    card.appendChild(pills);

    var acts = el('div', 'cso-sm-card__actions');

    var saveBtn = el('button', 'cso-sm-btn ' + (isSaved ? 'cso-sm-btn--saved' : 'cso-sm-btn--offline'),
      isSaved ? (orMode ? '✓ ଅଫଲାଇନ୍ ସେଭ୍ ହୋଇଛି' : '✓ Saved Offline') : (orMode ? '⬇ ଅଫଲାଇନ୍ ସେଭ୍' : '⬇ Save Offline')
    );
    saveBtn.type = 'button';
    saveBtn.setAttribute('aria-pressed', isSaved ? 'true' : 'false');
    saveBtn.addEventListener('click', function () { toggleSaveOffline(it); });
    acts.appendChild(saveBtn);

    var shareUrl = (window.location.origin || 'https://csodisha.com') + (it.detail_url || '/study-materials/');
    var waText = it.title_en + ' (' + (it.exam_tag || 'Odisha Exam') + ') — Free Notes & PYQs on CSOdisha: ' + shareUrl;
    var waBtn = el('a', 'cso-sm-btn cso-sm-btn--wa', 'WhatsApp');
    waBtn.setAttribute('href', 'https://wa.me/?text=' + encodeURIComponent(waText));
    waBtn.setAttribute('target', '_blank');
    waBtn.setAttribute('rel', 'noopener noreferrer');
    waBtn.setAttribute('aria-label', 'Share on WhatsApp: ' + it.title_en);
    acts.appendChild(waBtn);

    var ctaLabel = it.pdf_url
      ? (orMode ? 'PDF ଡାଉନଲୋଡ୍ →' : 'Download PDF →')
      : (orMode ? 'ନୋଟ୍ସ ଖୋଲନ୍ତୁ →' : 'Open Notes →');
    var openBtn = el('a', 'cso-sm-btn cso-sm-btn--primary', ctaLabel);
    openBtn.setAttribute('href', it.pdf_url || it.detail_url || '/study-library/');
    if (it.pdf_url) {
      openBtn.setAttribute('target', '_blank');
      openBtn.setAttribute('rel', 'noopener noreferrer');
    }
    acts.appendChild(openBtn);

    card.appendChild(acts);
    return card;
  }

  function renderGrid() {
    var grid = document.getElementById('cso-sm-grid');
    var countEl = document.getElementById('cso-sm-results-count');
    if (!grid) return;
    var orMode = isOdia();
    var filtered = state.allItems.filter(matchesFilters);

    if (countEl) {
      countEl.textContent = orMode
        ? ('ମୋଟ ' + filtered.length + ' ଟି ଅଧ୍ୟୟନ ସାମଗ୍ରୀ ଓ PYQ ମିଳିଲା')
        : ('Showing ' + filtered.length + ' of ' + state.allItems.length + ' study notes, PYQs & syllabus packs');
    }

    if (!filtered.length) {
      var empty = el('div', 'cso-sm-empty');
      empty.appendChild(el('h3', 'cso-sm-empty__title', orMode ? 'କୌଣସି ସାମଗ୍ରୀ ମିଳିଲା ନାହିଁ' : 'No matching study materials found'));
      empty.appendChild(el('p', 'cso-sm-empty__desc', orMode ? 'ଫିଲ୍ଟର ସଫା କରି ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ।' : 'Reset filters to explore all Odisha exam notes, PYQs & syllabus PDFs.'));
      var resetBtn = el('button', 'cso-sm-btn cso-sm-btn--primary', orMode ? 'ସବୁ ଫିଲ୍ଟର ସଫା କରନ୍ତୁ' : 'Reset Filters');
      resetBtn.type = 'button';
      resetBtn.addEventListener('click', resetFilters);
      empty.appendChild(resetBtn);
      grid.replaceChildren(empty);
      return;
    }

    var frag = document.createDocumentFragment();
    filtered.forEach(function (it) { frag.appendChild(buildCard(it)); });
    grid.replaceChildren(frag);
  }

  function syncControls() {
    var root = document.getElementById(HUB_ID);
    if (!root) return;
    var qIn = document.getElementById('cso-sm-search');
    if (qIn && qIn.value !== state.filters.q) qIn.value = state.filters.q;
    var subSel = document.getElementById('cso-sm-subject');
    if (subSel && subSel.value !== state.filters.subject) subSel.value = state.filters.subject;
    var langSel = document.getElementById('cso-sm-language');
    if (langSel && langSel.value !== state.filters.language) langSel.value = state.filters.language;

    root.querySelectorAll('.cso-sm-fmt-tab').forEach(function (t) {
      var on = (t.getAttribute('data-format') || 'all') === state.filters.format;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    root.querySelectorAll('.cso-sm-exam-pill').forEach(function (p) {
      var on = (p.getAttribute('data-exam') || 'all') === state.filters.exam;
      p.classList.toggle('is-active', on);
      p.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function resetFilters() {
    state.filters = { q: '', format: 'all', exam: 'all', subject: 'all', language: 'all' };
    syncControls();
    renderGrid();
  }

  function localizeStaticCopy() {
    var root = document.getElementById(HUB_ID);
    if (!root) return;
    var orMode = isOdia();
    root.querySelectorAll('[data-en]').forEach(function (n) {
      var txt = orMode ? n.getAttribute('data-or') : n.getAttribute('data-en');
      if (txt) n.textContent = txt;
    });
    root.querySelectorAll('.cso-sm-lang-btn').forEach(function (b) {
      var active = (b.getAttribute('data-lang') === 'or') === orMode;
      b.classList.toggle('is-active', active);
      b.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function bindEvents() {
    var root = document.getElementById(HUB_ID);
    if (!root || root.getAttribute('data-bound') === '1') return;
    root.setAttribute('data-bound', '1');

    var qIn = document.getElementById('cso-sm-search');
    var timer = null;
    if (qIn) {
      qIn.addEventListener('input', function () {
        clearTimeout(timer);
        timer = setTimeout(function () {
          state.filters.q = (qIn.value || '').trim();
          renderGrid();
        }, 140);
      });
    }

    var subSel = document.getElementById('cso-sm-subject');
    if (subSel) subSel.addEventListener('change', function () { state.filters.subject = subSel.value || 'all'; renderGrid(); });

    var langSel = document.getElementById('cso-sm-language');
    if (langSel) langSel.addEventListener('change', function () { state.filters.language = langSel.value || 'all'; renderGrid(); });

    root.addEventListener('click', function (ev) {
      var t = ev.target && ev.target.closest ? ev.target : null;
      if (!t) return;
      var fmtTab = t.closest('.cso-sm-fmt-tab');
      if (fmtTab) {
        state.filters.format = fmtTab.getAttribute('data-format') || 'all';
        syncControls();
        renderGrid();
        return;
      }
      var exPill = t.closest('.cso-sm-exam-pill');
      if (exPill) {
        state.filters.exam = exPill.getAttribute('data-exam') || 'all';
        syncControls();
        renderGrid();
        return;
      }
      var langBtn = t.closest('.cso-sm-lang-btn');
      if (langBtn) {
        state.lang = langBtn.getAttribute('data-lang') === 'or' ? 'or' : 'en';
        localizeStaticCopy();
        renderGrid();
      }
    });

    window.addEventListener('cso:lang-change', function (ev) {
      var l = ev && ev.detail && ev.detail.lang;
      if (l === 'or' || l === 'en') {
        state.lang = l;
        localizeStaticCopy();
        renderGrid();
      }
    });
  }

  function init() {
    var root = document.getElementById(HUB_ID);
    if (!root) return;

    loadSavedShelf();
    var params = new URLSearchParams(window.location.search || '');
    state.filters.q = (params.get('q') || params.get('search') || '').trim();
    state.filters.format = (params.get('format') || params.get('tab') || 'all').trim().toLowerCase() || 'all';
    state.filters.exam = (params.get('exam') || 'all').trim().toLowerCase() || 'all';
    state.filters.subject = (params.get('subject') || 'all').trim().toLowerCase() || 'all';
    state.filters.language = (params.get('lang') || 'all').trim().toLowerCase() || 'all';

    bindEvents();
    syncControls();
    localizeStaticCopy();
    updateOfflineCount();

    fetch('/api/public/study-hub', { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (data && data.ok) {
          state.allItems = Array.isArray(data.items) ? data.items : [];
          state.summary = data.summary || state.summary;
          updateSummary(state.summary);
        }
        renderGrid();
      })
      .catch(function () {
        renderGrid();
      });
  }

  window.CSOStudyMaterialsHub = { init: init, resetFilters: resetFilters, OFFLINE_STUDY_CACHE: OFFLINE_STUDY_CACHE };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window, document);
