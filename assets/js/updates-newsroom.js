/**
 * Common Sense Odisha — Public /updates/ Unified Chronological Newsroom Controller (v398)
 * Hydrates live from GET /feed.json?limit=60, supports category filtering (?category=),
 * instant bilingual keyword search, Newest vs Upcoming Deadlines sorting,
 * 1-click RSS/JSON URL copy, ☆ Save (CSOSavedAlerts), 📅 .ics (CSOCalendarExport),
 * and progressive Load More pagination.
 * Strict CSP-compliant: DOM APIs only, zero inline styles/handlers.
 */
(function (rootFactory) {
  var api = rootFactory(
    typeof window !== 'undefined' ? window : globalThis,
    typeof document !== 'undefined' ? document : null
  );
  if (typeof window !== 'undefined') window.CSOUpdatesNewsroom = api;
  if (typeof globalThis !== 'undefined') globalThis.CSOUpdatesNewsroom = api;
})(function (win, doc) {
  'use strict';

  var PAGE_SIZE = 12;
  var state = {
    lang: 'en',
    category: 'all',
    district: '',
    includeStatewide: true,
    q: '',
    sort: 'newest',
    visibleCount: PAGE_SIZE,
    items: []
  };
  var districtBarCtrl = null;

  var CAT_TABS = [
    { key: 'all', en: 'All', or: 'ସବୁ' },
    { key: 'jobs', en: 'Jobs', or: 'ଚାକିରି' },
    { key: 'exams', en: 'Exams & Admit Cards', or: 'ପରୀକ୍ଷା ଓ ଆଡମିଟ୍' },
    { key: 'results', en: 'Results', or: 'ଫଳାଫଳ' },
    { key: 'guides', en: 'Guides', or: 'ଗାଇଡ୍' }
  ];

  function classifyFeedItem(it) {
    var bi = (it && it._cso_bilingual) || {};
    var cat = String(bi.category || (Array.isArray(it && it.tags) ? it.tags[0] : '') || '').toLowerCase();
    var url = String((it && it.url) || '').toLowerCase();
    if (cat.indexOf('result') !== -1) return 'results';
    if (cat.indexOf('exam') !== -1 || cat.indexOf('admit') !== -1) return 'exams';
    if (cat.indexOf('job') !== -1) return 'jobs';
    if (url.indexOf('/guides/') !== -1) return 'guides';
    return 'guides';
  }

  function filterAndSortItems(items, opts) {
    var list = Array.isArray(items) ? items : [];
    var o = opts || {};
    var cat = String(o.category || 'all').toLowerCase();
    var dist = String(o.district || '').trim().toLowerCase();
    var includeStatewide = o.includeStatewide !== undefined ? Boolean(o.includeStatewide) : true;
    var q = String(o.q || '').trim().toLowerCase();
    var sort = String(o.sort || 'newest').toLowerCase();

    var counts = { all: 0, jobs: 0, exams: 0, results: 0, guides: 0 };
    var textMatched = [];

    for (var i = 0; i < list.length; i += 1) {
      var it = list[i];
      if (!it) continue;
      var bi = it._cso_bilingual || {};
      if (dist && win && win.CSODistrictFilter && typeof win.CSODistrictFilter.matchDistrict === 'function') {
        if (!win.CSODistrictFilter.matchDistrict(it, dist, { includeStatewide: includeStatewide })) continue;
      }
      if (q) {
        var hay = [it.title, it.summary, bi.title_en, bi.title_or, bi.summary_en, bi.summary_or, bi.org, bi.district, bi.category].join(' ').toLowerCase();
        if (hay.indexOf(q) === -1) continue;
      }
      var bucket = classifyFeedItem(it);
      counts.all += 1;
      if (Object.prototype.hasOwnProperty.call(counts, bucket)) counts[bucket] += 1;
      textMatched.push({ item: it, bucket: bucket });
    }

    var filtered = cat === 'all'
      ? textMatched
      : textMatched.filter(function (x) { return x.bucket === cat; });

    filtered.sort(function (a, b) {
      if (sort === 'deadlines') {
        var da = (a.item._cso_bilingual && a.item._cso_bilingual.deadline_iso) || '';
        var db = (b.item._cso_bilingual && b.item._cso_bilingual.deadline_iso) || '';
        if (da && !db) return -1;
        if (!da && db) return 1;
        if (da && db && da !== db) return da.localeCompare(db);
      }
      return String(b.item.date_modified || b.item.date_published || '').localeCompare(String(a.item.date_modified || a.item.date_published || ''));
    });

    return {
      counts: counts,
      results: filtered.map(function (x) { return Object.assign({}, x.item, { _bucket: x.bucket }); })
    };
  }

  function formatIstDate(iso) {
    if (!iso) return '';
    try {
      var d = new Date(iso);
      if (isNaN(d.getTime())) return String(iso).slice(0, 10);
      return d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' });
    } catch (_) {
      return String(iso).slice(0, 10);
    }
  }

  function safeUrl(raw) {
    var s = String(raw || '').trim();
    if (s.startsWith('/') && !s.startsWith('//')) return s;
    if (/^https?:\/\//i.test(s)) return s;
    return '/';
  }

  function el(tag, cls, text) {
    var n = doc.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null && text !== '') n.textContent = String(text);
    return n;
  }

  function copyText(str) {
    if (win.navigator && win.navigator.clipboard && typeof win.navigator.clipboard.writeText === 'function') {
      return win.navigator.clipboard.writeText(str);
    }
    return new Promise(function (resolve) {
      try {
        var ta = doc.createElement('textarea');
        ta.value = str;
        ta.className = 'cso-sr-only';
        doc.body.appendChild(ta);
        ta.select();
        doc.execCommand('copy');
        ta.remove();
      } catch (_) {}
      resolve();
    });
  }

  function getActiveFeedUrl(format) {
    var base = 'https://csodisha.com/' + (format === 'json' ? 'feed.json' : 'feed.xml');
    if (state.category && state.category !== 'all') {
      return base + '?category=' + encodeURIComponent(state.category);
    }
    return base;
  }

  function syncSubscribeLinks() {
    var rssA = doc.getElementById('cso-un-rss-link');
    var jsonA = doc.getElementById('cso-un-json-link');
    var suffix = (state.category && state.category !== 'all') ? ('?category=' + encodeURIComponent(state.category)) : '';
    if (rssA) {
      rssA.href = '/feed.xml' + suffix;
      rssA.textContent = '📡 Subscribe RSS (/feed.xml' + suffix + ')';
    }
    if (jsonA) {
      jsonA.href = '/feed.json' + suffix;
      jsonA.textContent = '{ } JSON Feed (/feed.json' + suffix + ')';
    }
  }

  function localizeStatic() {
    var root = doc.getElementById('cso-updates-newsroom-root');
    if (!root) return;
    var orMode = state.lang === 'or';
    root.querySelectorAll('[data-en]').forEach(function (n) {
      var t = orMode ? n.getAttribute('data-or') : n.getAttribute('data-en');
      if (t) n.textContent = t;
    });
    root.querySelectorAll('[data-un-lang]').forEach(function (b) {
      var active = b.getAttribute('data-un-lang') === state.lang;
      b.classList.toggle('is-active', active);
      b.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function render() {
    var pillsHost = doc.getElementById('cso-un-cat-pills');
    var countEl = doc.getElementById('cso-un-count');
    var listHost = doc.getElementById('cso-un-timeline');
    var moreWrap = doc.getElementById('cso-un-more-wrap');
    if (!listHost) return;

    var orMode = state.lang === 'or';
    var out = filterAndSortItems(state.items, {
      category: state.category,
      district: state.district,
      includeStatewide: state.includeStatewide,
      q: state.q,
      sort: state.sort
    });
    syncSubscribeLinks();

    if (pillsHost) {
      pillsHost.replaceChildren();
      CAT_TABS.forEach(function (t) {
        var cnt = out.counts[t.key] || 0;
        var b = el('button', 'cso-un-cat-pill' + (state.category === t.key ? ' is-active' : ''), (orMode ? t.or : t.en) + ' (' + cnt + ')');
        b.type = 'button';
        b.setAttribute('role', 'tab');
        b.setAttribute('data-un-cat', t.key);
        b.setAttribute('aria-selected', state.category === t.key ? 'true' : 'false');
        b.addEventListener('click', function () {
          state.category = t.key;
          state.visibleCount = PAGE_SIZE;
          try {
            var u = new URL(win.location.href);
            if (t.key === 'all') u.searchParams.delete('category');
            else u.searchParams.set('category', t.key);
            win.history.replaceState({}, '', u.toString());
          } catch (_) {}
          render();
        });
        pillsHost.appendChild(b);
      });
    }

    var shown = out.results.slice(0, state.visibleCount);
    if (countEl) {
      countEl.textContent = orMode
        ? ('ମୋଟ ' + out.results.length + ' ଟି ଯାଞ୍ଚିତ ଅପଡେଟ୍ ମଧ୍ୟରୁ ' + shown.length + ' ଟି ଦେଖାଯାଉଛି')
        : ('Showing ' + shown.length + ' of ' + out.results.length + ' verified updates');
    }

    listHost.replaceChildren();
    if (!shown.length) {
      listHost.appendChild(el('div', 'cso-un-empty', orMode
        ? 'ଏହି ଫିଲ୍ଟରରେ କୌଣସି ଅପଡେଟ୍ ମିଳିଲା ନାହିଁ।'
        : 'No verified updates match this filter yet.'));
    } else {
      var frag = doc.createDocumentFragment();
      shown.forEach(function (it) {
        var bi = it._cso_bilingual || {};
        var card = el('article', 'cso-un-card');

        var top = el('div', 'cso-un-card__top');
        top.appendChild(el('span', 'cso-un-badge', bi.category || 'Update'));
        if (bi.org) top.appendChild(el('span', 'cso-un-org', bi.org));
        var pubDate = formatIstDate(it.date_published || it.date_modified);
        if (pubDate) top.appendChild(el('span', 'cso-un-date', '🗓️ ' + pubDate));
        if (bi.deadline_iso) {
          top.appendChild(el('span', 'cso-un-deadline', (orMode ? 'ଶେଷ ତାରିଖ: ' : 'Key Date: ') + bi.deadline_iso));
        }
        card.appendChild(top);

        var h2 = el('h2', 'cso-un-card__title');
        var titleText = (orMode && bi.title_or) ? bi.title_or : (bi.title_en || it.title || 'Update');
        var a = el('a', 'cso-un-card__link', titleText);
        a.href = safeUrl(it.url);
        h2.appendChild(a);
        card.appendChild(h2);

        if (!orMode && bi.title_or && bi.title_or !== bi.title_en) {
          card.appendChild(el('div', 'cso-un-card__bi', bi.title_or));
        }

        var sumTxt = (orMode && bi.summary_or) ? bi.summary_or : (bi.summary_en || it.summary || '');
        if (sumTxt) card.appendChild(el('p', 'cso-un-card__desc', sumTxt));

        var acts = el('div', 'cso-un-card__acts');
        var openA = el('a', 'cso-un-feed-btn cso-un-feed-btn--primary', orMode ? 'ବିଜ୍ଞପ୍ତି ଖୋଲନ୍ତୁ ↗' : 'Open Notice ↗');
        openA.href = safeUrl(it.url);
        acts.appendChild(openA);

        if (win.CSOSavedAlerts && typeof win.CSOSavedAlerts.createBookmarkButton === 'function') {
          var saveBtn = win.CSOSavedAlerts.createBookmarkButton({
            id: 'upd:' + (it.url || titleText),
            slug: String(it.url || '').split('/').pop() || '',
            url: safeUrl(it.url),
            title_en: bi.title_en || it.title,
            title_or: bi.title_or || '',
            org: bi.org || 'Common Sense Odisha',
            category: it._bucket === 'jobs' ? 'job_alert' : (it._bucket === 'results' ? 'result' : (it._bucket === 'exams' ? 'exam_update' : 'guide')),
            deadline_iso: bi.deadline_iso || '',
            official_url: bi.official_url || ''
          }, { isOr: orMode, compact: true });
          if (saveBtn) acts.appendChild(saveBtn);
        }

        if (bi.deadline_iso && win.CSOCalendarExport && typeof win.CSOCalendarExport.createCalendarButton === 'function') {
          var icsBtn = win.CSOCalendarExport.createCalendarButton({
            event: {
              uid: 'upd-' + (String(it.url || '').split('/').pop() || 'item') + '-' + bi.deadline_iso,
              summary: bi.title_en || it.title,
              date: bi.deadline_iso,
              location: 'Odisha / Official Portal',
              url: it.url,
              officialUrl: bi.official_url || '',
              description: bi.summary_en || ''
            },
            filename: String(it.url || 'cso-update').split('/').pop(),
            isOr: orMode,
            compact: true
          });
          if (icsBtn) acts.appendChild(icsBtn);
        }

        card.appendChild(acts);
        frag.appendChild(card);
      });
      listHost.appendChild(frag);
    }

    if (moreWrap) {
      moreWrap.hidden = shown.length >= out.results.length;
    }
  }

  function init() {
    var root = doc && doc.getElementById('cso-updates-newsroom-root');
    if (!root) return;

    try {
      var u = new URL(win.location.href);
      var cat = String(u.searchParams.get('category') || '').toLowerCase();
      if (['jobs', 'exams', 'results', 'guides'].indexOf(cat) !== -1) state.category = cat;
      if (win.CSODistrictFilter && typeof win.CSODistrictFilter.readUrlParams === 'function') {
        var dfp = win.CSODistrictFilter.readUrlParams(win.location.href);
        state.district = dfp.district;
        state.includeStatewide = dfp.includeStatewide;
      }
    } catch (_) {}

    var distHost = doc.getElementById('cso-updates-district-bar');
    if (distHost && win.CSODistrictFilter && typeof win.CSODistrictFilter.mountSelectorBar === 'function') {
      districtBarCtrl = win.CSODistrictFilter.mountSelectorBar(distHost, {
        district: state.district,
        includeStatewide: state.includeStatewide,
        lang: state.lang,
        items: state.items,
        onChange: function (next) {
          state.district = next.district;
          state.includeStatewide = next.includeStatewide;
          state.visibleCount = PAGE_SIZE;
          render();
        }
      });
    }

    root.querySelectorAll('[data-un-lang]').forEach(function (b) {
      b.addEventListener('click', function () {
        state.lang = b.getAttribute('data-un-lang') === 'or' ? 'or' : 'en';
        localizeStatic();
        if (districtBarCtrl) districtBarCtrl.update({ lang: state.lang });
        render();
      });
    });

    var searchInp = doc.getElementById('cso-un-search');
    if (searchInp) {
      searchInp.addEventListener('input', function () {
        state.q = searchInp.value;
        state.visibleCount = PAGE_SIZE;
        render();
      });
    }

    var sortSel = doc.getElementById('cso-un-sort');
    if (sortSel) {
      sortSel.addEventListener('change', function () {
        state.sort = sortSel.value || 'newest';
        render();
      });
    }

    var moreBtn = doc.getElementById('cso-un-load-more');
    if (moreBtn) {
      moreBtn.addEventListener('click', function () {
        state.visibleCount += PAGE_SIZE;
        render();
      });
    }

    root.querySelectorAll('[data-copy-feed]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var fmt = btn.getAttribute('data-copy-feed');
        var urlToCopy = getActiveFeedUrl(fmt);
        var orig = btn.getAttribute('data-orig') || btn.textContent;
        btn.setAttribute('data-orig', orig);
        copyText(urlToCopy).then(function () {
          btn.textContent = '✅ Copied!';
          setTimeout(function () { btn.textContent = orig; }, 2200);
        });
      });
    });

    localizeStatic();
    fetch('/feed.json?limit=60', { credentials: 'same-origin' })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        state.items = Array.isArray(d && d.items) ? d.items : [];
        if (districtBarCtrl) {
          districtBarCtrl.update({
            district: state.district,
            includeStatewide: state.includeStatewide,
            lang: state.lang,
            items: state.items
          });
        }
        render();
      })
      .catch(function () {
        var countEl = doc.getElementById('cso-un-count');
        if (countEl) countEl.textContent = 'Unable to load live feed right now. Please refresh.';
      });
  }

  if (doc) {
    if (doc.readyState === 'loading') {
      doc.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }

  return {
    version: 'v398',
    classifyFeedItem: classifyFeedItem,
    filterAndSortItems: filterAndSortItems,
    init: init
  };
});
