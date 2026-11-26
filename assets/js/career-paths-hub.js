/**
 * Common Sense Odisha — Interactive Career Paths, Qualification Matcher & ORSP Pay Hub UI (v376)
 * Powers /career-paths/ from GET /api/public/careers-hub.
 * Strict CSP-compliant: DOM APIs only (document.createElement / textContent / addEventListener).
 * Zero inline handlers, zero inline styles, bilingual EN / ଓଡ଼ିଆ, 4-theme semantic tokens.
 */
(function (window, document) {
  'use strict';

  var HUB_ID = 'cso-careers-hub-root';

  var state = {
    lang: 'en',
    allItems: [],
    summary: { career_tracks: 8, qualification_levels: 5, pay_scales: 8, linked_guides_and_mocks: 8 },
    filters: { q: '', qual: 'all', domain: 'all' }
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

  function updateSummary(summary) {
    var root = document.getElementById(HUB_ID);
    if (!root || !summary) return;
    var map = {
      tracks: Number(summary.career_tracks || 8),
      quals: Number(summary.qualification_levels || 5),
      pay: Number(summary.pay_scales || 8),
      linked: Number(summary.linked_guides_and_mocks || 8)
    };
    Object.keys(map).forEach(function (k) {
      var node = root.querySelector('[data-cp-kpi="' + k + '"]');
      if (node) node.textContent = map[k].toLocaleString('en-IN');
    });
  }

  function matchesFilters(it) {
    var f = state.filters;
    if (f.q) {
      var hay = [it.title_en, it.title_or, it.domain, it.min_qualification, it.pay_level, (it.key_exams || []).join(' ')].join(' ').toLowerCase();
      if (hay.indexOf(f.q.toLowerCase()) === -1) return false;
    }
    if (f.qual !== 'all') {
      if (!Array.isArray(it.qual_keys) || it.qual_keys.indexOf(f.qual) === -1) return false;
    }
    if (f.domain !== 'all') {
      if (it.domain_key !== f.domain) return false;
    }
    return true;
  }

  function buildCard(it) {
    var orMode = isOdia();
    var card = el('article', 'cso-cp-card');

    // Top row: Sector badge + Pay-level pill
    var top = el('div', 'cso-cp-card__top');
    top.appendChild(el('span', 'cso-cp-sector-badge', it.domain || 'Career Track'));
    top.appendChild(el('span', 'cso-cp-pay-badge', '💰 ' + (it.pay_level || 'ORSP 7th Pay')));
    card.appendChild(top);

    // Bilingual Title
    var primaryTitle = (orMode && it.title_or) ? it.title_or : it.title_en;
    var secondaryTitle = (orMode && it.title_or) ? it.title_en : (it.title_or || '');
    card.appendChild(el('h3', 'cso-cp-card__title', primaryTitle));
    if (secondaryTitle) card.appendChild(el('p', 'cso-cp-card__bi', secondaryTitle));

    // Qualification & Age relaxation summary
    var meta = el('div', 'cso-cp-meta');
    meta.appendChild(el('span', 'cso-cp-pill', '🎓 ' + (orMode ? 'ଯୋଗ୍ୟତା: ' : 'Min Qual: ') + (it.min_qualification || 'Graduate')));
    if (it.age_range) meta.appendChild(el('span', 'cso-cp-pill', '📅 ' + it.age_range));
    if (it.timeline_months) meta.appendChild(el('span', 'cso-cp-pill', '⏱️ ~' + it.timeline_months + (orMode ? ' ମାସ ପ୍ରସ୍ତୁତି' : ' mo cycle')));
    card.appendChild(meta);

    // Visual Step-by-Step Selection Stage Stepper (1 -> 2 -> 3)
    if (Array.isArray(it.selection_stages) && it.selection_stages.length) {
      var stepper = el('ol', 'cso-cp-stepper');
      stepper.setAttribute('aria-label', 'Selection stages');
      it.selection_stages.forEach(function (st, idx) {
        var li = el('li', 'cso-cp-step');
        li.appendChild(el('span', 'cso-cp-step__num', String(idx + 1)));
        li.appendChild(el('span', 'cso-cp-step__txt', st));
        stepper.appendChild(li);
      });
      card.appendChild(stepper);
    }

    // Key Exams chips
    if (Array.isArray(it.key_exams) && it.key_exams.length) {
      var examsRow = el('div', 'cso-cp-exams');
      it.key_exams.forEach(function (ex) {
        examsRow.appendChild(el('span', 'cso-cp-exam-chip', ex));
      });
      card.appendChild(examsRow);
    }

    // Action Footer: WhatsApp Share + Practice Mocks + Read Career Guide ->
    var acts = el('div', 'cso-cp-card__actions');

    var shareUrl = (window.location.origin || 'https://csodisha.com') + '/career-paths/';
    var waText = it.title_en + ' (' + (it.pay_level || 'ORSP Pay') + ') — Career Roadmap & Eligibility on CSOdisha: ' + shareUrl;
    var waBtn = el('a', 'cso-cp-btn cso-cp-btn--wa', 'WhatsApp');
    waBtn.setAttribute('href', 'https://wa.me/?text=' + encodeURIComponent(waText));
    waBtn.setAttribute('target', '_blank');
    waBtn.setAttribute('rel', 'noopener noreferrer');
    waBtn.setAttribute('aria-label', 'Share on WhatsApp: ' + it.title_en);
    acts.appendChild(waBtn);

    var mockBtn = el('a', 'cso-cp-btn cso-cp-btn--outline', orMode ? '⏱️ ମକ୍ ଟେଷ୍ଟ' : '⏱️ Practice Mocks');
    mockBtn.setAttribute('href', it.mocks_url || '/mock-tests/');
    acts.appendChild(mockBtn);

    var guideBtn = el('a', 'cso-cp-btn cso-cp-btn--primary', orMode ? 'କ୍ୟାରିଅର ଗାଇଡ୍ →' : 'Read Career Guide →');
    guideBtn.setAttribute('href', it.guide_url || '/guides/?category=career');
    acts.appendChild(guideBtn);

    card.appendChild(acts);
    return card;
  }

  function renderGrid() {
    var grid = document.getElementById('cso-cp-grid');
    var countEl = document.getElementById('cso-cp-results-count');
    if (!grid) return;
    var orMode = isOdia();
    var filtered = state.allItems.filter(matchesFilters);

    if (countEl) {
      countEl.textContent = orMode
        ? ('ମୋଟ ' + filtered.length + ' ଟି କ୍ୟାରିଅର ରୋଡମ୍ୟାପ୍ ମିଳିଲା')
        : ('Showing ' + filtered.length + ' of ' + state.allItems.length + ' Odisha & Central career roadmaps');
    }

    if (!filtered.length) {
      var empty = el('div', 'cso-cp-empty');
      empty.appendChild(el('h3', 'cso-cp-empty__title', orMode ? 'କୌଣସି କ୍ୟାରିଅର ପଥ ମିଳିଲା ନାହିଁ' : 'No matching career roadmaps found'));
      empty.appendChild(el('p', 'cso-cp-empty__desc', orMode ? 'ଫିଲ୍ଟର ସଫା କରି ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ।' : 'Reset qualification or sector filters to see all Odisha career pathways.'));
      var resetBtn = el('button', 'cso-cp-btn cso-cp-btn--primary', orMode ? 'ସବୁ ଫିଲ୍ଟର ସଫା କରନ୍ତୁ' : 'Reset Filters');
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
    var qIn = document.getElementById('cso-cp-search');
    if (qIn && qIn.value !== state.filters.q) qIn.value = state.filters.q;

    root.querySelectorAll('.cso-cp-qual-pill').forEach(function (p) {
      var on = (p.getAttribute('data-qual') || 'all') === state.filters.qual;
      p.classList.toggle('is-active', on);
      p.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    root.querySelectorAll('.cso-cp-domain-pill').forEach(function (p) {
      var on = (p.getAttribute('data-domain') || 'all') === state.filters.domain;
      p.classList.toggle('is-active', on);
      p.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function resetFilters() {
    state.filters = { q: '', qual: 'all', domain: 'all' };
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
    root.querySelectorAll('.cso-cp-lang-btn').forEach(function (b) {
      var active = (b.getAttribute('data-lang') === 'or') === orMode;
      b.classList.toggle('is-active', active);
      b.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function bindEvents() {
    var root = document.getElementById(HUB_ID);
    if (!root || root.getAttribute('data-bound') === '1') return;
    root.setAttribute('data-bound', '1');

    var qIn = document.getElementById('cso-cp-search');
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

    root.addEventListener('click', function (ev) {
      var t = ev.target && ev.target.closest ? ev.target : null;
      if (!t) return;
      var qPill = t.closest('.cso-cp-qual-pill');
      if (qPill) {
        state.filters.qual = qPill.getAttribute('data-qual') || 'all';
        syncControls();
        renderGrid();
        return;
      }
      var dPill = t.closest('.cso-cp-domain-pill');
      if (dPill) {
        state.filters.domain = dPill.getAttribute('data-domain') || 'all';
        syncControls();
        renderGrid();
        return;
      }
      var langBtn = t.closest('.cso-cp-lang-btn');
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

    var params = new URLSearchParams(window.location.search || '');
    state.filters.q = (params.get('q') || params.get('search') || '').trim();
    state.filters.qual = (params.get('qual') || 'all').trim().toLowerCase() || 'all';
    state.filters.domain = (params.get('domain') || params.get('sector') || 'all').trim().toLowerCase() || 'all';

    bindEvents();
    syncControls();
    localizeStaticCopy();

    fetch('/api/public/careers-hub', { credentials: 'same-origin' })
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

  window.CSOCareerPathsHub = { init: init, resetFilters: resetFilters };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window, document);
