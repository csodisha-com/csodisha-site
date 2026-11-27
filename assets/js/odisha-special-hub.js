/**
 * Common Sense Odisha — Interactive Odisha Special, 30-District Explorer & State GK Hub UI (v377)
 * Powers /odisha-special/ from GET /api/public/odisha-hub.
 * Strict CSP-compliant: DOM APIs only (document.createElement / textContent / addEventListener).
 * Zero inline handlers, zero inline styles, bilingual EN / ଓଡ଼ିଆ, 4-theme semantic tokens.
 */
(function (window, document) {
  'use strict';

  var HUB_ID = 'cso-odisha-hub-root';

  var state = {
    lang: 'en',
    districts: [],
    items: [],
    quiz: [],
    answers: {},
    districtStats: { bySlug: {}, totalDistrictTagged: 0, totalLive: 0 },
    filters: { division: 'all', distQ: '', tab: 'all', itemQ: '' }
  };

  function resolveCanonicalDistrictSlug(d, dfApi) {
    var api = dfApi || window.CSODistrictFilter;
    var raw = (d && (d.slug || d.name_en)) || '';
    if (api && typeof api.resolveDistrictSlug === 'function') {
      var r = api.resolveDistrictSlug(raw);
      if (r) return r;
    }
    return String(raw).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  function computeDistrictLiveStats(searchItems, dfApi) {
    var api = dfApi || window.CSODistrictFilter;
    var list = Array.isArray(searchItems) ? searchItems : [];
    var nonHub = list.filter(function (it) {
      return it && it.type !== 'hub';
    });
    var bySlug = {};
    var matchedItemIds = {};
    var districtsList = (api && Array.isArray(api.DISTRICTS)) ? api.DISTRICTS : [];

    for (var i = 0; i < districtsList.length; i += 1) {
      var slug = districtsList[i].slug;
      var activeJobs = 0;
      var totalUpdates = 0;
      for (var k = 0; k < nonHub.length; k += 1) {
        var it = nonHub[k];
        if (api && typeof api.matchDistrict === 'function' && api.matchDistrict(it, slug, { includeStatewide: false })) {
          totalUpdates += 1;
          if (it.type === 'job_alert') activeJobs += 1;
          matchedItemIds[it.id || it.url || String(k)] = true;
        }
      }
      bySlug[slug] = {
        slug: slug,
        active_jobs: activeJobs,
        total_updates: totalUpdates,
        jobs_url: '/jobs/?district=' + encodeURIComponent(slug),
        updates_url: '/updates/?district=' + encodeURIComponent(slug)
      };
    }

    return {
      bySlug: bySlug,
      totalDistrictTagged: Object.keys(matchedItemIds).length,
      totalLive: nonHub.length
    };
  }

  function updateLiveStrip() {
    var strip = document.getElementById('cso-od-dist-live-strip');
    if (!strip) return;
    var txtEl = strip.querySelector('.cso-od-live-strip__text');
    if (!txtEl) return;
    var orMode = isOdia();
    var tagged = state.districtStats.totalDistrictTagged || 0;
    var totalLive = state.districtStats.totalLive || 0;
    txtEl.textContent = orMode
      ? ('📍 ଓଡ଼ିଶାର ୩୦ ଜିଲ୍ଲାରେ ' + tagged + ' ଟି ଜିଲ୍ଲା-ସ୍ତରୀୟ ବିଜ୍ଞପ୍ତି (ମୋଟ ' + totalLive + ' ଟି ସକ୍ରିୟ ଅପଡେଟ୍)')
      : ('📍 ' + tagged + ' district-tagged notices live across Odisha\'s 30 districts (' + totalLive + ' total live alerts)');
  }

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
      districts: Number(summary.districts_covered || 30),
      capsules: Number(summary.gk_capsules || 4),
      gi: Number(summary.gi_and_culture_highlights || 16),
      updates: Number(summary.live_state_updates || 4)
    };
    Object.keys(map).forEach(function (k) {
      var node = root.querySelector('[data-od-kpi="' + k + '"]');
      if (node) node.textContent = map[k].toLocaleString('en-IN');
    });
  }

  function renderDistricts() {
    var grid = document.getElementById('cso-od-districts-grid');
    var countEl = document.getElementById('cso-od-dist-count');
    if (!grid) return;
    var orMode = isOdia();
    var div = state.filters.division;
    var q = state.filters.distQ.toLowerCase();

    var filtered = state.districts.filter(function (d) {
      if (div !== 'all' && d.division.toLowerCase() !== div) return false;
      if (q) {
        var hay = [d.name_en, d.name_or, d.hq_en, d.hq_or, d.famous_for_en, d.famous_for_or, d.division].join(' ').toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });

    if (countEl) {
      countEl.textContent = orMode
        ? ('ମୋଟ ' + filtered.length + ' ଟି ଜିଲ୍ଲା ଦେଖାଯାଉଛି')
        : ('Showing ' + filtered.length + ' of ' + state.districts.length + ' Odisha districts');
    }

    var frag = document.createDocumentFragment();
    filtered.forEach(function (d) {
      var card = el('article', 'cso-od-dist-card');
      var top = el('div', 'cso-od-dist-card__top');
      top.appendChild(el('span', 'cso-od-div-badge', d.division + (orMode ? ' ଡିଭିଜନ୍' : ' Division')));
      top.appendChild(el('span', 'cso-od-hq-badge', (orMode ? 'ସଦର: ' : 'HQ: ') + (orMode ? d.hq_or : d.hq_en)));
      card.appendChild(top);

      var slug = resolveCanonicalDistrictSlug(d);
      var st = (state.districtStats && state.districtStats.bySlug && state.districtStats.bySlug[slug]) || {
        active_jobs: 0,
        total_updates: 0,
        jobs_url: '/jobs/?district=' + encodeURIComponent(slug),
        updates_url: '/updates/?district=' + encodeURIComponent(slug)
      };

      var title = orMode ? d.name_or : d.name_en;
      var sub = orMode ? d.name_en : d.name_or;
      card.appendChild(el('h3', 'cso-od-dist-card__title', title + ' (' + sub + ')'));

      var liveBadges = el('div', 'cso-od-dist-live-badges');
      if (st.active_jobs > 0) {
        liveBadges.appendChild(el('span', 'cso-od-live-badge is-jobs', orMode
          ? ('🟢 ' + st.active_jobs + ' ସକ୍ରିୟ ଚାକିରି')
          : ('🟢 ' + st.active_jobs + ' Active ' + (st.active_jobs === 1 ? 'Job' : 'Jobs'))));
      }
      if (st.total_updates > 0) {
        liveBadges.appendChild(el('span', 'cso-od-live-badge is-updates', orMode
          ? ('📋 ' + st.total_updates + ' ଅପଡେଟ୍')
          : ('📋 ' + st.total_updates + ' ' + (st.total_updates === 1 ? 'Update' : 'Updates'))));
      } else {
        var swBadge = el('span', 'cso-od-live-badge is-statewide', orMode ? '🌐 ସାରା ଓଡ଼ିଶା ଯୋଗ୍ୟ' : '🌐 Statewide Eligible');
        swBadge.title = orMode
          ? 'ଏହି ଜିଲ୍ଲାର ପ୍ରାର୍ଥୀମାନେ ସମସ୍ତ ରାଜ୍ୟ-ସ୍ତରୀୟ ଓଡ଼ିଶା ବିଜ୍ଞପ୍ତି ପାଇଁ ଯୋଗ୍ୟ।'
          : 'Candidates from this district are eligible for all statewide Odisha vacancies.';
        liveBadges.appendChild(swBadge);
      }
      card.appendChild(liveBadges);

      card.appendChild(el('p', 'cso-od-dist-card__famous', orMode ? d.famous_for_or : d.famous_for_en));

      var acts = el('div', 'cso-od-dist-card__actions');
      var jobsLink = el('a', 'cso-od-btn cso-od-btn--primary', orMode
        ? ('💼 ' + d.name_or + ' ଚାକିରି →')
        : ('💼 Jobs in ' + d.name_en + ' →'));
      jobsLink.setAttribute('href', st.jobs_url);
      acts.appendChild(jobsLink);

      var updatesLink = el('a', 'cso-od-btn cso-od-btn--outline', orMode ? '📰 ସମସ୍ତ ଅପଡେଟ୍ →' : '📰 All Updates →');
      updatesLink.setAttribute('href', st.updates_url);
      acts.appendChild(updatesLink);

      var portal = el('a', 'cso-od-btn cso-od-btn--gov', orMode ? '✓ .odisha.gov.in ↗' : '✓ Official Portal ↗');
      portal.setAttribute('href', d.district_portal_url || 'https://odisha.gov.in/');
      portal.setAttribute('target', '_blank');
      portal.setAttribute('rel', 'noopener noreferrer');
      acts.appendChild(portal);

      card.appendChild(acts);
      frag.appendChild(card);
    });
    grid.replaceChildren(frag);
  }

  function renderItems() {
    var grid = document.getElementById('cso-od-items-grid');
    if (!grid) return;
    var orMode = isOdia();
    var tab = state.filters.tab;
    var q = state.filters.itemQ.toLowerCase();

    var filtered = state.items.filter(function (it) {
      if (tab !== 'all' && it.tab_key !== tab) return false;
      if (q) {
        var hay = [it.title_en, it.title_or, it.summary_en, it.summary_or, it.category_label].join(' ').toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });

    if (!filtered.length) {
      var empty = el('div', 'cso-od-empty');
      empty.appendChild(el('p', '', orMode ? 'ଏହି ବର୍ଗରେ କୌଣସି ସୂଚନା ମିଳିଲା ନାହିଁ।' : 'No Odisha GK capsules matched your filter.'));
      grid.replaceChildren(empty);
      return;
    }

    var frag = document.createDocumentFragment();
    filtered.forEach(function (it) {
      var card = el('article', 'cso-od-card');
      card.appendChild(el('span', 'cso-od-cat-badge', it.category_label || 'Odisha Special'));

      var primary = (orMode && it.title_or) ? it.title_or : it.title_en;
      var secondary = (orMode && it.title_or) ? it.title_en : (it.title_or || '');
      var h3 = el('h3', 'cso-od-card__title');
      var a = el('a', 'cso-od-card__link', primary);
      a.setAttribute('href', it.detail_url || '/guides/?category=odisha-gk');
      h3.appendChild(a);
      card.appendChild(h3);

      if (secondary) card.appendChild(el('p', 'cso-od-card__bi', secondary));
      var desc = (orMode && it.summary_or) ? it.summary_or : it.summary_en;
      if (desc) card.appendChild(el('p', 'cso-od-card__desc', desc));

      var acts = el('div', 'cso-od-card__actions');
      var shareUrl = (window.location.origin || 'https://csodisha.com') + (it.detail_url || '/odisha-special/');
      var waText = it.title_en + ' — Odisha Special GK on CSOdisha: ' + shareUrl;
      var wa = el('a', 'cso-od-btn cso-od-btn--wa', 'WhatsApp');
      wa.setAttribute('href', 'https://wa.me/?text=' + encodeURIComponent(waText));
      wa.setAttribute('target', '_blank');
      wa.setAttribute('rel', 'noopener noreferrer');
      wa.setAttribute('aria-label', 'Share on WhatsApp: ' + it.title_en);
      acts.appendChild(wa);

      var open = el('a', 'cso-od-btn cso-od-btn--primary', orMode ? 'ସମ୍ପୂର୍ଣ୍ଣ ପଢ଼ନ୍ତୁ →' : 'Read Capsule →');
      open.setAttribute('href', it.detail_url || '/guides/?category=odisha-gk');
      acts.appendChild(open);
      card.appendChild(acts);

      frag.appendChild(card);
    });
    grid.replaceChildren(frag);
  }

  function renderQuiz() {
    var root = document.getElementById('cso-od-quiz-root');
    if (!root) return;
    var orMode = isOdia();
    var total = state.quiz.length;
    var answered = 0;
    var score = 0;

    state.quiz.forEach(function (q) {
      if (Object.prototype.hasOwnProperty.call(state.answers, q.id)) {
        answered += 1;
        if (state.answers[q.id] === q.correct_index) score += 1;
      }
    });

    var scoreEl = document.getElementById('cso-od-quiz-score');
    if (scoreEl) {
      scoreEl.textContent = orMode
        ? ('ସ୍କୋର୍: ' + score + ' / ' + total + ' (' + answered + ' ଉତ୍ତର ଦିଆଯାଇଛି)')
        : ('Score: ' + score + ' / ' + total + ' (' + answered + ' answered)');
    }

    var frag = document.createDocumentFragment();
    state.quiz.forEach(function (q, idx) {
      var box = el('article', 'cso-od-q-card');
      var head = el('div', 'cso-od-q-head');
      head.appendChild(el('span', 'cso-od-q-num', 'Q' + (idx + 1)));
      head.appendChild(el('span', 'cso-od-div-badge', q.exam_tag));
      box.appendChild(head);

      box.appendChild(el('p', 'cso-od-q-text', (orMode && q.question_or) ? q.question_or : q.question_en));

      var optsWrap = el('div', 'cso-od-q-opts');
      var chosen = Object.prototype.hasOwnProperty.call(state.answers, q.id) ? state.answers[q.id] : -1;
      var opts = (orMode && Array.isArray(q.options_or)) ? q.options_or : q.options_en;

      opts.forEach(function (txt, oi) {
        var cls = 'cso-od-q-opt';
        if (chosen !== -1) {
          if (oi === q.correct_index) cls += ' is-correct';
          else if (oi === chosen) cls += ' is-wrong';
        }
        var btn = el('button', cls, String.fromCharCode(65 + oi) + '. ' + txt);
        btn.type = 'button';
        btn.setAttribute('data-qid', q.id);
        btn.setAttribute('data-opt', String(oi));
        if (chosen !== -1) btn.disabled = true;
        optsWrap.appendChild(btn);
      });
      box.appendChild(optsWrap);

      if (chosen !== -1) {
        var right = chosen === q.correct_index;
        var fb = el('div', 'cso-od-q-feedback ' + (right ? 'is-correct' : 'is-wrong'));
        fb.textContent = (right ? (orMode ? '✓ ଠିକ୍ ଉତ୍ତର! ' : '✓ Correct! ') : (orMode ? '✕ ଭୁଲ୍ ଉତ୍ତର। ' : '✕ Not quite. ')) + ((orMode && q.explanation_or) ? q.explanation_or : q.explanation_en);
        box.appendChild(fb);
      }
      frag.appendChild(box);
    });
    root.replaceChildren(frag);
  }

  function localizeStaticCopy() {
    var root = document.getElementById(HUB_ID);
    if (!root) return;
    var orMode = isOdia();
    root.querySelectorAll('[data-en]').forEach(function (n) {
      var txt = orMode ? n.getAttribute('data-or') : n.getAttribute('data-en');
      if (txt) n.textContent = txt;
    });
    root.querySelectorAll('.cso-od-lang-btn').forEach(function (b) {
      var active = (b.getAttribute('data-lang') === 'or') === orMode;
      b.classList.toggle('is-active', active);
      b.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function syncControls() {
    var root = document.getElementById(HUB_ID);
    if (!root) return;
    root.querySelectorAll('.cso-od-div-pill').forEach(function (p) {
      var on = (p.getAttribute('data-division') || 'all') === state.filters.division;
      p.classList.toggle('is-active', on);
      p.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    root.querySelectorAll('.cso-od-tab').forEach(function (t) {
      var on = (t.getAttribute('data-tab') || 'all') === state.filters.tab;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
    });
  }

  function bindEvents() {
    var root = document.getElementById(HUB_ID);
    if (!root || root.getAttribute('data-bound') === '1') return;
    root.setAttribute('data-bound', '1');

    var distInput = document.getElementById('cso-od-dist-search');
    var t1 = null;
    if (distInput) {
      distInput.addEventListener('input', function () {
        clearTimeout(t1);
        t1 = setTimeout(function () { state.filters.distQ = (distInput.value || '').trim(); renderDistricts(); }, 120);
      });
    }

    var itemInput = document.getElementById('cso-od-item-search');
    var t2 = null;
    if (itemInput) {
      itemInput.addEventListener('input', function () {
        clearTimeout(t2);
        t2 = setTimeout(function () { state.filters.itemQ = (itemInput.value || '').trim(); renderItems(); }, 120);
      });
    }

    var resetQuizBtn = document.getElementById('cso-od-quiz-reset');
    if (resetQuizBtn) {
      resetQuizBtn.addEventListener('click', function () { state.answers = {}; renderQuiz(); });
    }

    root.addEventListener('click', function (ev) {
      var t = ev.target && ev.target.closest ? ev.target : null;
      if (!t) return;
      var divBtn = t.closest('.cso-od-div-pill');
      if (divBtn) {
        state.filters.division = divBtn.getAttribute('data-division') || 'all';
        syncControls();
        renderDistricts();
        return;
      }
      var tabBtn = t.closest('.cso-od-tab');
      if (tabBtn) {
        state.filters.tab = tabBtn.getAttribute('data-tab') || 'all';
        syncControls();
        renderItems();
        return;
      }
      var langBtn = t.closest('.cso-od-lang-btn');
      if (langBtn) {
        state.lang = langBtn.getAttribute('data-lang') === 'or' ? 'or' : 'en';
        localizeStaticCopy();
        updateLiveStrip();
        renderDistricts();
        renderItems();
        renderQuiz();
        return;
      }
      var optBtn = t.closest('.cso-od-q-opt');
      if (optBtn && !optBtn.disabled) {
        var qid = optBtn.getAttribute('data-qid');
        var oi = Number(optBtn.getAttribute('data-opt'));
        if (qid && isFinite(oi)) {
          state.answers[qid] = oi;
          renderQuiz();
        }
      }
    });

    window.addEventListener('cso:lang-change', function (ev) {
      var l = ev && ev.detail && ev.detail.lang;
      if (l === 'or' || l === 'en') {
        state.lang = l;
        localizeStaticCopy();
        renderDistricts();
        renderItems();
        renderQuiz();
      }
    });
  }

  function init() {
    var root = document.getElementById(HUB_ID);
    if (!root) return;
    bindEvents();
    syncControls();
    localizeStaticCopy();

    Promise.all([
      fetch('/api/public/odisha-hub', { credentials: 'same-origin' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .catch(function () { return null; }),
      fetch('/api/public/search-index', { credentials: 'same-origin' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .catch(function () { return null; })
    ]).then(function (results) {
      var data = results[0];
      var searchData = results[1];
      if (data && data.ok) {
        state.districts = Array.isArray(data.districts) ? data.districts : [];
        state.items = Array.isArray(data.items) ? data.items : [];
        state.quiz = Array.isArray(data.odisha_quiz) ? data.odisha_quiz : [];
        updateSummary(data.summary);
      }
      if (searchData && Array.isArray(searchData.items)) {
        state.districtStats = computeDistrictLiveStats(searchData.items, window.CSODistrictFilter);
      }
      updateLiveStrip();
      renderDistricts();
      renderItems();
      renderQuiz();
    });
  }

  var hubApi = {
    version: 'v401',
    init: init,
    computeDistrictLiveStats: computeDistrictLiveStats,
    resolveCanonicalDistrictSlug: resolveCanonicalDistrictSlug
  };
  window.CSOOdishaSpecialHub = hubApi;
  window.CSOOdishaHub = hubApi;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window, document);
