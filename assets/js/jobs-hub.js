/**
 * Common Sense Odisha — Interactive Jobs & Recruitment Hub UI (v372)
 * Powers /jobs/ from GET /api/public/jobs-hub (aggregating job_articles, posts & recruitment guides).
 * Strict CSP-compliant: DOM APIs only (document.createElement / textContent / addEventListener).
 * Zero inline handlers, zero inline styles, bilingual EN / ଓଡ଼ିଆ, 4-theme semantic tokens.
 */
(function (window, document) {
  'use strict';

  var HUB_ID = 'cso-jobs-hub-root';
  var PORTAL_ID = 'cso-jobs-portal-root';

  var state = {
    lang: 'en',
    allItems: [],
    summary: { total_active: 0, closing_soon: 0, districts_covered: 30, verified_gov_count: 0 },
    filters: { q: '', org: 'all', type: 'all', district: '', includeStatewide: true, watchlistOnly: false, qual: '' }
  };
  var districtBarCtrl = null;
  var watchlistBarCtrl = null;

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
    var mi = Number(p[1]) - 1;
    return p[2] + ' ' + (months[mi] || p[1]) + ' ' + p[0];
  }

  function getCardAccentClass(item) {
    if (item.category === 'Admit Card') return 'cso-jh-card--purple';
    if (item.category === 'Result' || item.category === 'Answer Key') return 'cso-jh-card--success';
    if (item.source_type === 'guide' || item.category === 'Strategy Guide') return 'cso-jh-card--saffron';
    if (item.org_group === 'central') return 'cso-jh-card--info';
    return 'cso-jh-card--brand';
  }

  function matchesFilters(it) {
    var f = state.filters;
    if (f.q) {
      var hay = [it.title_en, it.title_or, it.summary_en, it.organization, it.category, it.district, it.qualification].join(' ').toLowerCase();
      if (hay.indexOf(f.q.toLowerCase()) === -1) return false;
    }
    if (f.org && f.org !== 'all') {
      if (it.org_group !== f.org) return false;
    }
    if (f.type && f.type !== 'all') {
      if (f.type === 'vacancies' && it.category !== 'Latest Vacancy') return false;
      if (f.type === 'admit-cards' && it.category !== 'Admit Card') return false;
      if (f.type === 'results' && it.category !== 'Result' && it.category !== 'Answer Key') return false;
      if (f.type === 'guides' && it.source_type !== 'guide' && it.category !== 'Strategy Guide') return false;
    }
    if (f.watchlistOnly && window.CSOWatchlist && typeof window.CSOWatchlist.matchesWatchlist === 'function') {
      if (!window.CSOWatchlist.matchesWatchlist(it).matched) return false;
    }
    if (f.district) {
      if (window.CSODistrictFilter && typeof window.CSODistrictFilter.matchDistrict === 'function') {
        if (!window.CSODistrictFilter.matchDistrict(it, f.district, { includeStatewide: f.includeStatewide })) return false;
      } else if (it.district !== f.district && it.district !== 'All Odisha') {
        return false;
      }
    }
    if (f.qual) {
      var qv = String(it.qualification || '').toLowerCase();
      if (f.qual === 'bed-pg') {
        if (qv.indexOf('b.ed') === -1 && qv.indexOf('post-grad') === -1 && qv.indexOf('diploma') === -1) return false;
      } else if (qv.indexOf(f.qual.toLowerCase()) === -1) {
        return false;
      }
    }
    return true;
  }

  function updateSummaryStrip(summary) {
    var root = document.getElementById(HUB_ID);
    if (!root || !summary) return;
    var map = {
      total: Number(summary.total_active || 0),
      closing: Number(summary.closing_soon || 0),
      districts: Number(summary.districts_covered || 30),
      verified: Number(summary.verified_gov_count || 0)
    };
    Object.keys(map).forEach(function (k) {
      var node = root.querySelector('[data-jh-kpi="' + k + '"]');
      if (node) node.textContent = map[k].toLocaleString('en-IN');
    });
  }

  function buildDeadlineBadge(it, orMode) {
    if (it.source_type === 'guide' && !it.last_date) {
      return el('span', 'cso-jh-deadline cso-jh-deadline--guide', orMode ? '📘 ଗାଇଡ୍' : '📘 Guide');
    }
    if (it.days_remaining !== null && it.days_remaining !== undefined) {
      if (it.days_remaining < 0) {
        return el('span', 'cso-jh-deadline cso-jh-deadline--closed', orMode ? 'ସମାପ୍ତ' : 'Closed');
      }
      if (it.days_remaining === 0) {
        return el('span', 'cso-jh-deadline cso-jh-deadline--urgent', orMode ? 'ଆଜି ଶେଷ ତାରିଖ' : 'Closes Today');
      }
      if (it.days_remaining <= 7) {
        var txt = orMode ? (it.days_remaining + ' ଦିନ ବାକି') : ('Closing in ' + it.days_remaining + 'd');
        return el('span', 'cso-jh-deadline cso-jh-deadline--urgent', txt);
      }
      var activeTxt = (orMode ? 'ଶେଷ: ' : 'Last Date: ') + formatDate(it.last_date);
      return el('span', 'cso-jh-deadline cso-jh-deadline--active', activeTxt);
    }
    return el('span', 'cso-jh-deadline cso-jh-deadline--active', orMode ? 'ସକ୍ରିୟ' : 'Active');
  }

  function buildCard(it) {
    var orMode = isOdia();
    var card = el('article', 'cso-jh-card ' + getCardAccentClass(it));

    // Top row: Org badge + Category badge + Deadline countdown
    var top = el('div', 'cso-jh-card__top');
    var leftMeta = el('div', 'cso-jh-card__badges');
    leftMeta.appendChild(el('span', 'cso-jh-org-badge', it.organization || 'Govt. of Odisha'));
    leftMeta.appendChild(el('span', 'cso-jh-cat-badge', it.category || 'Latest Vacancy'));
    top.appendChild(leftMeta);
    top.appendChild(buildDeadlineBadge(it, orMode));
    card.appendChild(top);

    // Bilingual Title
    var primaryTitle = (orMode && it.title_or) ? it.title_or : (it.title_en || 'Recruitment Notification');
    var secondaryTitle = (orMode && it.title_or && it.title_en) ? it.title_en : (!orMode && it.title_or ? it.title_or : '');
    var h3 = el('h3', 'cso-jh-card__title');
    var titleLink = el('a', 'cso-jh-card__link', primaryTitle);
    titleLink.setAttribute('href', it.detail_url || '/jobs/');
    h3.appendChild(titleLink);
    card.appendChild(h3);

    if (secondaryTitle) {
      card.appendChild(el('p', 'cso-jh-card__sub-bi', secondaryTitle));
    }

    var desc = (orMode && it.summary_or) ? it.summary_or : it.summary_en;
    if (desc) {
      card.appendChild(el('p', 'cso-jh-card__desc', desc));
    }

    // Metadata pills: posts, qualification, district
    var pills = el('div', 'cso-jh-card__pills');
    if (window.CSOWatchlist && typeof window.CSOWatchlist.createMatchBadge === 'function') {
      var wlBadge = window.CSOWatchlist.createMatchBadge(it, null, orMode);
      if (wlBadge) {
        card.classList.add('is-watchlist-match');
        pills.appendChild(wlBadge);
      }
    }
    if (Number(it.total_posts || 0) > 0) {
      pills.appendChild(el('span', 'cso-jh-pill cso-jh-pill--posts', Number(it.total_posts).toLocaleString('en-IN') + (orMode ? ' ପଦବୀ' : ' Posts')));
    }
    if (it.qualification) {
      pills.appendChild(el('span', 'cso-jh-pill', (orMode ? '🎓 ' : '🎓 ') + it.qualification));
    }
    if (it.district) {
      pills.appendChild(el('span', 'cso-jh-pill', '📍 ' + it.district));
    }
    if (it.is_verified_gov) {
      pills.appendChild(el('span', 'cso-jh-pill cso-jh-pill--gov', '✓ .gov.in'));
    }
    card.appendChild(pills);

    // Action footer: View Details + Save + QR Flyer + Official Portal (v451 enriched quick actions)
    var actions = el('div', 'cso-jh-card__actions');

    var ctaLabel = it.source_type === 'guide'
      ? (orMode ? 'ଗାଇଡ୍ ପଢ଼ନ୍ତୁ →' : 'Read Guide →')
      : (orMode ? 'ବିବରଣୀ ଦେଖନ୍ତୁ →' : 'View Details');
    var detailBtn = el('a', 'cso-jh-btn cso-jh-btn--primary', ctaLabel);
    detailBtn.setAttribute('href', it.detail_url || '/jobs/');
    actions.appendChild(detailBtn);

    var alertId = 'job-' + String(it.slug || it.id || it.title_en || 'notice').toLowerCase().replace(/[^a-z0-9-]+/g, '-').slice(0, 48);
    var isSaved = Boolean(window.CSOSavedAlerts && typeof window.CSOSavedAlerts.isSaved === 'function' && window.CSOSavedAlerts.isSaved(alertId));
    var saveBtn = el('button', 'cso-jh-btn cso-jh-btn--save' + (isSaved ? ' is-saved' : ''), isSaved ? (orMode ? '★ ସେଭ୍' : '★ Saved') : (orMode ? '☆ ସେଭ୍' : '☆ Save'));
    saveBtn.type = 'button';
    saveBtn.setAttribute('aria-pressed', isSaved ? 'true' : 'false');
    saveBtn.setAttribute('aria-label', (isSaved ? 'Remove from saved: ' : 'Save job notice: ') + (it.title_en || 'Notice'));
    saveBtn.addEventListener('click', function () {
      if (window.CSOSavedAlerts && typeof window.CSOSavedAlerts.toggleAlert === 'function') {
        window.CSOSavedAlerts.toggleAlert({
          id: alertId,
          title: it.title_en || 'Odisha Recruitment',
          category: it.category || 'Recruitment',
          deadline: it.last_date || '',
          url: it.detail_url || '/jobs/'
        });
        var nowSaved = window.CSOSavedAlerts.isSaved(alertId);
        saveBtn.classList.toggle('is-saved', nowSaved);
        saveBtn.setAttribute('aria-pressed', nowSaved ? 'true' : 'false');
        saveBtn.textContent = nowSaved ? (orMode ? '★ ସେଭ୍' : '★ Saved') : (orMode ? '☆ ସେଭ୍' : '☆ Save');
      }
    });
    actions.appendChild(saveBtn);

    var shareUrl = (window.location.origin || 'https://csodisha.com') + (it.detail_url || '/jobs/');
    var qrBtn = el('button', 'cso-jh-btn cso-jh-btn--qr', orMode ? '📲 QR ଫ୍ଲାୟର୍' : '📲 QR Flyer');
    qrBtn.type = 'button';
    qrBtn.setAttribute('aria-label', 'Open QR Flyer for: ' + (it.title_en || 'Notice'));
    qrBtn.addEventListener('click', function () {
      try {
        window.dispatchEvent(new window.CustomEvent('cso:qr-flyer-load', {
          detail: {
            board: it.organization || 'Odisha Govt',
            titleEn: it.title_en || 'Odisha Recruitment Notification',
            titleOr: it.title_or || it.title_en || '',
            vacancies: Number(it.total_posts || 0) > 0 ? (Number(it.total_posts).toLocaleString('en-IN') + ' Posts') : 'See Notification',
            qualification: it.qualification || 'Post-Specific',
            lastDate: it.last_date || 'Check Official Portal',
            fee: it.org_group === 'central' ? 'As per Central Norms' : '₹0 (Odisha State Fee Exempted)',
            url: shareUrl
          }
        }));
        window.dispatchEvent(new window.CustomEvent('cso:jobs-open-tab', { detail: { tab: 'qr', scroll: true } }));
      } catch (_) {}
    });
    actions.appendChild(qrBtn);

    if (it.official_url && it.is_verified_gov) {
      var offBtn = el('a', 'cso-jh-btn cso-jh-btn--gov', orMode ? 'ପୋର୍ଟାଲ୍ ↗' : 'Official Portal ↗');
      offBtn.setAttribute('href', it.official_url);
      offBtn.setAttribute('target', '_blank');
      offBtn.setAttribute('rel', 'noopener noreferrer');
      actions.appendChild(offBtn);
    }

    card.appendChild(actions);
    return card;
  }

  function renderGrid() {
    var grid = document.getElementById('cso-jh-grid');
    var statusEl = document.getElementById('cso-jh-results-count');
    if (!grid) return;
    var orMode = isOdia();
    var filtered = state.allItems.filter(matchesFilters);

    if (statusEl) {
      statusEl.textContent = orMode
        ? ('ମୋଟ ' + filtered.length + ' ଟି ବିଜ୍ଞପ୍ତି ଓ ଗାଇଡ୍ ମିଳିଲା')
        : ('Showing ' + filtered.length + ' of ' + state.allItems.length + ' active notices & recruitment guides');
    }

    if (!filtered.length) {
      var empty = el('div', 'cso-jh-empty');
      empty.appendChild(el('h3', 'cso-jh-empty__title', orMode ? 'କୌଣସି ଫଳାଫଳ ମିଳିଲା ନାହିଁ' : 'No matching notices found'));
      empty.appendChild(el('p', 'cso-jh-empty__desc', orMode
        ? 'ଫିଲ୍ଟର ବଦଳାନ୍ତୁ କିମ୍ବା ନିଯୁକ୍ତି ଗାଇଡ୍ ବିଭାଗ ଦେଖନ୍ତୁ।'
        : 'Try clearing a filter or browse our verified recruitment guides.'));
      var resetBtn = el('button', 'cso-jh-btn cso-jh-btn--primary', orMode ? 'ସବୁ ଫିଲ୍ଟର ସଫା କରନ୍ତୁ' : 'Reset Filters');
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

  function syncControlsToState() {
    var root = document.getElementById(HUB_ID);
    if (!root) return;
    var qInput = document.getElementById('cso-jh-search');
    if (qInput && qInput.value !== state.filters.q) qInput.value = state.filters.q;
    var distSel = document.getElementById('cso-jh-district');
    if (distSel && distSel.value !== state.filters.district) distSel.value = state.filters.district;
    var qualSel = document.getElementById('cso-jh-qual');
    if (qualSel && qualSel.value !== state.filters.qual) qualSel.value = state.filters.qual;

    root.querySelectorAll('.cso-jh-org-pill').forEach(function (btn) {
      var on = (btn.getAttribute('data-org') || 'all') === state.filters.org;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    root.querySelectorAll('.cso-jh-type-tab').forEach(function (tab) {
      var on = (tab.getAttribute('data-type') || 'all') === state.filters.type;
      tab.classList.toggle('is-active', on);
      tab.setAttribute('aria-selected', on ? 'true' : 'false');
    });
  }

  function resetFilters() {
    state.filters = { q: '', org: 'all', type: 'all', district: '', includeStatewide: true, watchlistOnly: false, qual: '' };
    if (window.CSODistrictFilter && typeof window.CSODistrictFilter.syncUrlParams === 'function') {
      window.CSODistrictFilter.syncUrlParams('', true);
    }
    syncControlsToState();
    if (districtBarCtrl) districtBarCtrl.update({ district: '', includeStatewide: true, lang: state.lang, items: state.allItems });
    if (watchlistBarCtrl) watchlistBarCtrl.update({ activeOnly: false, lang: state.lang, items: state.allItems });
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
    root.querySelectorAll('.cso-jh-lang-btn').forEach(function (b) {
      var active = (b.getAttribute('data-lang') === 'or') === orMode;
      b.classList.toggle('is-active', active);
      b.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function bindEvents() {
    var root = document.getElementById(HUB_ID);
    if (!root || root.getAttribute('data-bound') === '1') return;
    root.setAttribute('data-bound', '1');

    var qInput = document.getElementById('cso-jh-search');
    var timer = null;
    if (qInput) {
      qInput.addEventListener('input', function () {
        clearTimeout(timer);
        timer = setTimeout(function () {
          state.filters.q = (qInput.value || '').trim();
          renderGrid();
        }, 140);
      });
    }

    var distSel = document.getElementById('cso-jh-district');
    if (distSel) {
      distSel.addEventListener('change', function () {
        var rawDist = distSel.value || '';
        state.filters.district = (window.CSODistrictFilter && window.CSODistrictFilter.resolveDistrictSlug)
          ? window.CSODistrictFilter.resolveDistrictSlug(rawDist)
          : rawDist;
        if (window.CSODistrictFilter && window.CSODistrictFilter.syncUrlParams) {
          window.CSODistrictFilter.syncUrlParams(state.filters.district, state.filters.includeStatewide);
        }
        if (districtBarCtrl) districtBarCtrl.update({ district: state.filters.district, includeStatewide: state.filters.includeStatewide, lang: state.lang, items: state.allItems });
        renderGrid();
      });
    }

    var qualSel = document.getElementById('cso-jh-qual');
    if (qualSel) {
      qualSel.addEventListener('change', function () {
        state.filters.qual = qualSel.value || '';
        renderGrid();
      });
    }

    root.addEventListener('click', function (ev) {
      var t = ev.target && ev.target.closest ? ev.target : null;
      if (!t) return;
      var orgBtn = t.closest('.cso-jh-org-pill');
      if (orgBtn) {
        state.filters.org = orgBtn.getAttribute('data-org') || 'all';
        syncControlsToState();
        renderGrid();
        return;
      }
      var typeTab = t.closest('.cso-jh-type-tab');
      if (typeTab) {
        state.filters.type = typeTab.getAttribute('data-type') || 'all';
        syncControlsToState();
        renderGrid();
        return;
      }
      var langBtn = t.closest('.cso-jh-lang-btn');
      if (langBtn) {
        state.lang = langBtn.getAttribute('data-lang') === 'or' ? 'or' : 'en';
        localizeStaticCopy();
        if (districtBarCtrl) districtBarCtrl.update({ lang: state.lang });
        if (watchlistBarCtrl) watchlistBarCtrl.update({ lang: state.lang });
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
    var hub = document.getElementById(HUB_ID);
    if (!hub) return;

    var params = new URLSearchParams(window.location.search || '');
    var hasArticleSlug = Boolean((params.get('slug') || '').trim() || (params.get('preview_token') || '').trim());
    var legacyPortal = document.getElementById(PORTAL_ID);

    if (hasArticleSlug) {
      hub.hidden = true;
      if (legacyPortal) legacyPortal.hidden = false;
      return;
    }

    hub.hidden = false;
    if (legacyPortal) legacyPortal.hidden = true;

    state.filters.q = (params.get('q') || params.get('search') || '').trim();
    state.filters.org = (params.get('org') || 'all').trim().toLowerCase() || 'all';
    state.filters.type = (params.get('type') || params.get('category') || 'all').trim().toLowerCase() || 'all';
    if (window.CSODistrictFilter && typeof window.CSODistrictFilter.readUrlParams === 'function') {
      var dfParams = window.CSODistrictFilter.readUrlParams(window.location.href);
      state.filters.district = dfParams.district;
      state.filters.includeStatewide = dfParams.includeStatewide;
    } else {
      state.filters.district = (params.get('district') || '').trim();
    }
    state.filters.qual = (params.get('qual') || params.get('qualification') || '').trim();

    var wlMount = document.getElementById('cso-jobs-watchlist-bar');
    if (wlMount && window.CSOWatchlist && typeof window.CSOWatchlist.mountWatchlistBar === 'function') {
      watchlistBarCtrl = window.CSOWatchlist.mountWatchlistBar(wlMount, {
        activeOnly: state.filters.watchlistOnly,
        lang: state.lang,
        items: state.allItems,
        onChange: function (next) {
          state.filters.watchlistOnly = Boolean(next && next.activeOnly);
          renderGrid();
        }
      });
    }

    var distMount = document.getElementById('cso-jobs-district-bar');
    if (distMount && window.CSODistrictFilter && typeof window.CSODistrictFilter.mountSelectorBar === 'function') {
      districtBarCtrl = window.CSODistrictFilter.mountSelectorBar(distMount, {
        district: state.filters.district,
        includeStatewide: state.filters.includeStatewide,
        lang: state.lang,
        items: state.allItems,
        onChange: function (next) {
          state.filters.district = next.district;
          state.filters.includeStatewide = next.includeStatewide;
          var dObj = window.CSODistrictFilter.getDistrictBySlug(next.district);
          var distSelEl = document.getElementById('cso-jh-district');
          if (distSelEl) distSelEl.value = dObj ? dObj.en : '';
          renderGrid();
        }
      });
    }

    bindEvents();
    syncControlsToState();
    localizeStaticCopy();

    fetch('/api/public/jobs-hub', { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (data && data.ok) {
          state.allItems = Array.isArray(data.items) ? data.items : [];
          state.summary = data.summary || state.summary;
          updateSummaryStrip(state.summary);
          if (districtBarCtrl) {
            districtBarCtrl.update({
              district: state.filters.district,
              includeStatewide: state.filters.includeStatewide,
              lang: state.lang,
              items: state.allItems
            });
          }
          if (watchlistBarCtrl) {
            watchlistBarCtrl.update({
              activeOnly: state.filters.watchlistOnly,
              lang: state.lang,
              items: state.allItems
            });
          }
        }
        renderGrid();
      })
      .catch(function () {
        renderGrid();
      });
  }

  window.CSOJobsHub = { init: init, resetFilters: resetFilters };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window, document);
