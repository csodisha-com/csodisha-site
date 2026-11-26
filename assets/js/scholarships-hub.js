/**
 * Common Sense Odisha — Interactive Scholarships & Financial Aid Hub UI (v374)
 * Powers /scholarships/ from GET /api/public/scholarships-hub.
 * Strict CSP-compliant: DOM APIs only (document.createElement / textContent / addEventListener).
 * Zero inline handlers, zero inline styles, bilingual EN / ଓଡ଼ିଆ, 4-theme semantic tokens.
 */
(function (window, document) {
  'use strict';

  var HUB_ID = 'cso-scholarships-hub-root';

  var state = {
    lang: 'en',
    allItems: [],
    summary: { active_scholarships: 8, verified_gov_portals: 2, odisha_and_nsp_schemes: 8, closing_within_15_days: 0 },
    filters: { q: '', level: 'all', category: 'all', portal: 'all' }
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

  function formatDate(ymd) {
    if (!ymd) return '';
    var p = String(ymd).split('-');
    if (p.length !== 3) return ymd;
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return p[2] + ' ' + (months[Number(p[1]) - 1] || p[1]) + ' ' + p[0];
  }

  function matchesFilters(it) {
    var f = state.filters;
    if (f.q) {
      var hay = [it.title_en, it.title_or, it.department_en, it.department_or, it.amount_summary, it.social_category, it.study_level, it.portal_domain].join(' ').toLowerCase();
      if (hay.indexOf(f.q.toLowerCase()) === -1) return false;
    }
    if (f.level && f.level !== 'all') {
      if (!Array.isArray(it.level_keys) || it.level_keys.indexOf(f.level) === -1) return false;
    }
    if (f.category && f.category !== 'all') {
      if (!Array.isArray(it.category_keys) || (it.category_keys.indexOf(f.category) === -1 && it.category_keys.indexOf('all') === -1)) return false;
    }
    if (f.portal && f.portal !== 'all') {
      if (it.portal_source !== f.portal) return false;
    }
    return true;
  }

  function updateSummary(summary) {
    var root = document.getElementById(HUB_ID);
    if (!root || !summary) return;
    var map = {
      active: Number(summary.active_scholarships || 0),
      portals: Number(summary.verified_gov_portals || 2),
      schemes: Number(summary.odisha_and_nsp_schemes || 0),
      closing: Number(summary.closing_within_15_days || 0)
    };
    Object.keys(map).forEach(function (k) {
      var node = root.querySelector('[data-sh-kpi="' + k + '"]');
      if (node) node.textContent = map[k].toLocaleString('en-IN');
    });
  }

  function buildStatusBadge(it, orMode) {
    if (it.status_label === 'Closing Soon' && it.days_remaining !== null && it.days_remaining >= 0) {
      var txt = orMode ? (it.days_remaining + ' ଦିନ ବାକି') : ('Closing in ' + it.days_remaining + 'd');
      return el('span', 'cso-sh-status cso-sh-status--urgent', txt);
    }
    if (it.status_label === 'Portal Renewal') {
      return el('span', 'cso-sh-status cso-sh-status--renewal', orMode ? 'ପୋର୍ଟାଲ୍ ନବୀକରଣ' : 'Portal Renewal');
    }
    var activeTxt = it.last_date
      ? ((orMode ? 'ଶେଷ: ' : 'Open • ') + formatDate(it.last_date))
      : (orMode ? 'ସକ୍ରିୟ' : 'Open / Active');
    return el('span', 'cso-sh-status cso-sh-status--open', activeTxt);
  }

  function buildCard(it) {
    var orMode = isOdia();
    var card = el('article', 'cso-sh-card');

    // Top row: Department badge + Portal badge + Status badge
    var top = el('div', 'cso-sh-card__top');
    var badges = el('div', 'cso-sh-card__badges');
    badges.appendChild(el('span', 'cso-sh-dept-badge', (orMode && it.department_or) ? it.department_or : (it.department_en || 'Govt. of Odisha')));
    if (it.is_verified_gov) {
      badges.appendChild(el('span', 'cso-sh-gov-badge', '✓ ' + (it.portal_domain || 'scholarship.odisha.gov.in')));
    }
    top.appendChild(badges);
    top.appendChild(buildStatusBadge(it, orMode));
    card.appendChild(top);

    // Bilingual Title
    var primaryTitle = (orMode && it.title_or) ? it.title_or : it.title_en;
    var secondaryTitle = (orMode && it.title_or) ? it.title_en : (it.title_or || '');
    card.appendChild(el('h3', 'cso-sh-card__title', primaryTitle));
    if (secondaryTitle) card.appendChild(el('p', 'cso-sh-card__bi', secondaryTitle));

    // Stipend / Benefit Highlight Pill
    if (it.amount_summary) {
      card.appendChild(el('div', 'cso-sh-amount', '💰 ' + it.amount_summary));
    }

    // Metadata pills: Study Level, Category, Income Ceiling
    var pills = el('div', 'cso-sh-card__pills');
    if (it.study_level) pills.appendChild(el('span', 'cso-sh-pill', '🎓 ' + it.study_level));
    if (it.social_category) pills.appendChild(el('span', 'cso-sh-pill', '👥 ' + it.social_category));
    if (it.income_ceiling) pills.appendChild(el('span', 'cso-sh-pill cso-sh-pill--income', '📄 ' + it.income_ceiling));
    card.appendChild(pills);

    // Required Documents Checklist Accordion
    if (Array.isArray(it.required_docs) && it.required_docs.length) {
      var details = el('details', 'cso-sh-docs');
      details.appendChild(el('summary', 'cso-sh-docs__sum', (orMode ? '📋 ଆବଶ୍ୟକ ଡକ୍ୟୁମେଣ୍ଟ ତାଲିକା (' : '📋 Required Documents Checklist (') + it.required_docs.length + ')'));
      var ul = el('ul', 'cso-sh-docs__list');
      it.required_docs.forEach(function (doc) {
        ul.appendChild(el('li', 'cso-sh-docs__item', '✓ ' + doc));
      });
      details.appendChild(ul);
      card.appendChild(details);
    }

    // Action footer: WhatsApp Share + Read Guide + Apply on Official .gov.in Portal
    var acts = el('div', 'cso-sh-card__actions');

    var shareUrl = (window.location.origin || 'https://csodisha.com') + '/scholarships/';
    var waText = it.title_en + ' (' + (it.amount_summary || 'Scholarship') + ') — Check eligibility & apply via CSOdisha: ' + shareUrl;
    var waBtn = el('a', 'cso-sh-btn cso-sh-btn--wa', 'WhatsApp');
    waBtn.setAttribute('href', 'https://wa.me/?text=' + encodeURIComponent(waText));
    waBtn.setAttribute('target', '_blank');
    waBtn.setAttribute('rel', 'noopener noreferrer');
    waBtn.setAttribute('aria-label', 'Share on WhatsApp: ' + it.title_en);
    acts.appendChild(waBtn);

    if (it.guide_url) {
      var guideBtn = el('a', 'cso-sh-btn cso-sh-btn--outline', orMode ? '📘 ଗାଇଡ୍ ପଢ଼ନ୍ତୁ' : '📘 Read Guide');
      guideBtn.setAttribute('href', it.guide_url);
      acts.appendChild(guideBtn);
    }

    var applyBtn = el('a', 'cso-sh-btn cso-sh-btn--primary', orMode ? 'ଅଫିସିଆଲ୍ .gov.in ପୋର୍ଟାଲ୍ ↗' : 'Apply on Official .gov.in ↗');
    applyBtn.setAttribute('href', it.official_url || 'https://scholarship.odisha.gov.in/');
    applyBtn.setAttribute('target', '_blank');
    applyBtn.setAttribute('rel', 'noopener noreferrer');
    acts.appendChild(applyBtn);

    card.appendChild(acts);
    return card;
  }

  function renderGrid() {
    var grid = document.getElementById('cso-sh-grid');
    var countEl = document.getElementById('cso-sh-results-count');
    if (!grid) return;
    var orMode = isOdia();
    var filtered = state.allItems.filter(matchesFilters);

    if (countEl) {
      countEl.textContent = orMode
        ? ('ମୋଟ ' + filtered.length + ' ଟି ବୃତ୍ତି ଓ ଆର୍ଥିକ ସହାୟତା ମିଳିଲା')
        : ('Showing ' + filtered.length + ' of ' + state.allItems.length + ' verified Odisha & National scholarships');
    }

    if (!filtered.length) {
      var empty = el('div', 'cso-sh-empty');
      empty.appendChild(el('h3', 'cso-sh-empty__title', orMode ? 'କୌଣସି ବୃତ୍ତି ମିଳିଲା ନାହିଁ' : 'No matching scholarships found'));
      empty.appendChild(el('p', 'cso-sh-empty__desc', orMode ? 'ଫିଲ୍ଟର ସଫା କରି ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ।' : 'Try clearing a filter to see all Odisha State & NSP scholarships.'));
      var resetBtn = el('button', 'cso-sh-btn cso-sh-btn--primary', orMode ? 'ସବୁ ଫିଲ୍ଟର ସଫା କରନ୍ତୁ' : 'Reset Filters');
      resetBtn.type = 'button';
      resetBtn.addEventListener('click', resetFilters);
      empty.appendChild(resetBtn);
      grid.replaceChildren(empty);
      return;
    }

    var frag = document.createDocumentFragment();
    filtered.forEach(function (it) {
      frag.appendChild(buildCard(it));
    });
    grid.replaceChildren(frag);
  }

  function syncControls() {
    var root = document.getElementById(HUB_ID);
    if (!root) return;
    var qIn = document.getElementById('cso-sh-search');
    if (qIn && qIn.value !== state.filters.q) qIn.value = state.filters.q;
    var catSel = document.getElementById('cso-sh-category');
    if (catSel && catSel.value !== state.filters.category) catSel.value = state.filters.category;
    var portSel = document.getElementById('cso-sh-portal');
    if (portSel && portSel.value !== state.filters.portal) portSel.value = state.filters.portal;

    root.querySelectorAll('.cso-sh-level-pill').forEach(function (btn) {
      var on = (btn.getAttribute('data-level') || 'all') === state.filters.level;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function resetFilters() {
    state.filters = { q: '', level: 'all', category: 'all', portal: 'all' };
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
    root.querySelectorAll('.cso-sh-lang-btn').forEach(function (b) {
      var active = (b.getAttribute('data-lang') === 'or') === orMode;
      b.classList.toggle('is-active', active);
      b.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function bindEvents() {
    var root = document.getElementById(HUB_ID);
    if (!root || root.getAttribute('data-bound') === '1') return;
    root.setAttribute('data-bound', '1');

    var qIn = document.getElementById('cso-sh-search');
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

    var catSel = document.getElementById('cso-sh-category');
    if (catSel) {
      catSel.addEventListener('change', function () {
        state.filters.category = catSel.value || 'all';
        renderGrid();
      });
    }

    var portSel = document.getElementById('cso-sh-portal');
    if (portSel) {
      portSel.addEventListener('change', function () {
        state.filters.portal = portSel.value || 'all';
        renderGrid();
      });
    }

    root.addEventListener('click', function (ev) {
      var t = ev.target && ev.target.closest ? ev.target : null;
      if (!t) return;
      var lvlBtn = t.closest('.cso-sh-level-pill');
      if (lvlBtn) {
        state.filters.level = lvlBtn.getAttribute('data-level') || 'all';
        syncControls();
        renderGrid();
        return;
      }
      var langBtn = t.closest('.cso-sh-lang-btn');
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
    state.filters.level = (params.get('level') || 'all').trim().toLowerCase() || 'all';
    state.filters.category = (params.get('category') || params.get('cat') || 'all').trim().toLowerCase() || 'all';
    state.filters.portal = (params.get('portal') || 'all').trim().toLowerCase() || 'all';

    bindEvents();
    syncControls();
    localizeStaticCopy();

    fetch('/api/public/scholarships-hub', { credentials: 'same-origin' })
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

  window.CSOScholarshipsHub = { init: init, resetFilters: resetFilters };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window, document);
