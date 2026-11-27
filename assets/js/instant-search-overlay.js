/**
 * Common Sense Odisha — Public Instant Search & Filter Overlay (Ctrl + K / /, v396)
 * Fetches GET /api/public/search-index on first open, caches in memory, ranks bilingual EN + ଓଡ଼ିଆ
 * multi-token matches safely via DOM <mark> nodes (zero innerHTML XSS), supports full keyboard
 * navigation (Ctrl+K, Cmd+K, /, ArrowUp, ArrowDown, Enter, Escape), recent searches, and
 * popular Odisha quick-filter chips.
 * Strict CSP-compliant: zero inline styles, zero inline handlers, 4-theme semantic tokens.
 */
(function (rootFactory) {
  var api = rootFactory(
    typeof window !== 'undefined' ? window : globalThis,
    typeof document !== 'undefined' ? document : null
  );
  if (typeof window !== 'undefined') window.CSOInstantSearch = api;
  if (typeof globalThis !== 'undefined') globalThis.CSOInstantSearch = api;
})(function (win, doc) {
  'use strict';

  var RECENT_KEY = 'cso_recent_searches_v1';
  var POPULAR_CHIPS = [
    'OSSTET Result',
    'CTET Dec 2026',
    'UGC NET',
    'Bhawanipatna / Kalahandi',
    'Odisha Districts'
  ];

  var FILTER_TABS = [
    { key: 'all', en: 'All', or: 'ସବୁ' },
    { key: 'job_alert', en: 'Jobs', or: 'ଚାକିରି' },
    { key: 'exam_update', en: 'Exams & Admit Cards', or: 'ପରୀକ୍ଷା ଓ ଆଡମିଟ୍' },
    { key: 'result', en: 'Results', or: 'ଫଳାଫଳ' },
    { key: 'guide', en: 'Guides', or: 'ଗାଇଡ୍' },
    { key: 'hub', en: 'Hubs', or: 'ହବ୍' }
  ];

  var cachedItems = null;
  var loadingPromise = null;
  var activeFilter = 'all';
  var activeQuery = '';
  var activeIndex = 0;
  var lastRenderedItems = [];
  var lastFocusedTrigger = null;

  function isOdia() {
    if (!doc) return false;
    var r = doc.documentElement;
    var b = doc.body;
    if (b && b.getAttribute('data-guide-lang') === 'or') return true;
    return Boolean(r && (r.getAttribute('lang') === 'or' || r.getAttribute('data-cso-lang') === 'or'));
  }

  function safeUrl(raw) {
    var s = String(raw || '').trim();
    if (s.startsWith('/') && !s.startsWith('//')) return s;
    if (/^https?:\/\//i.test(s)) return s;
    return '/';
  }

  function tokenize(raw) {
    return String(raw || '')
      .toLowerCase()
      .replace(/[\/,;|]+/g, ' ')
      .split(/\s+/)
      .filter(function (t) { return t.length >= 1; });
  }

  /**
   * Multi-token bilingual ranking engine (EN + ଓଡ଼ିଆ, districts, orgs, exam codes).
   * Exported for deterministic unit testing.
   */
  function searchAndRank(items, query, categoryFilter) {
    var list = Array.isArray(items) ? items : [];
    var q = String(query || '').trim().toLowerCase();
    var tokens = tokenize(q);
    var cat = String(categoryFilter || 'all').trim().toLowerCase();

    var scored = [];
    for (var i = 0; i < list.length; i += 1) {
      var it = list[i];
      if (!it) continue;
      var tEn = String(it.title_en || '').toLowerCase();
      var tOr = String(it.title_or || '').toLowerCase();
      var org = String(it.org || '').toLowerCase();
      var dist = String(it.district || '').toLowerCase();
      var kw = String(it.keywords || '').toLowerCase();
      var catLbl = (String(it.category_label_en || '') + ' ' + String(it.category_label_or || '')).toLowerCase();
      var hay = tEn + ' ' + tOr + ' ' + org + ' ' + dist + ' ' + kw + ' ' + catLbl;

      var score = 0;
      if (tokens.length > 0) {
        var matchedCount = 0;
        if (tEn.indexOf(q) !== -1 || tOr.indexOf(q) !== -1) score += 60;
        for (var j = 0; j < tokens.length; j += 1) {
          var tok = tokens[j];
          if (hay.indexOf(tok) === -1) continue;
          matchedCount += 1;
          if (tEn.indexOf(tok) !== -1 || tOr.indexOf(tok) !== -1) score += 24;
          else if (dist.indexOf(tok) !== -1 || org.indexOf(tok) !== -1) score += 16;
          else score += 8;
        }
        if (matchedCount === 0) continue;
        // Require all tokens to match unless multi-token chip like "Bhawanipatna / Kalahandi"
        if (tokens.length > 1 && matchedCount < tokens.length) {
          if (q.indexOf('/') === -1) continue;
        }
        if (matchedCount === tokens.length) score += 20;
      } else {
        score = it.type === 'hub' ? 5 : 10;
      }

      scored.push({ item: it, score: score });
    }

    scored.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      return String(b.item.updated_at || '').localeCompare(String(a.item.updated_at || ''));
    });

    var counts = { all: scored.length, job_alert: 0, exam_update: 0, result: 0, guide: 0, hub: 0 };
    scored.forEach(function (s) {
      var tp = s.item.type || 'guide';
      if (Object.prototype.hasOwnProperty.call(counts, tp)) counts[tp] += 1;
    });

    var filtered = cat === 'all'
      ? scored
      : scored.filter(function (s) { return s.item.type === cat; });

    return {
      counts: counts,
      results: filtered.map(function (s) { return s.item; })
    };
  }

  function readRecentSearches() {
    try {
      var raw = win.localStorage && win.localStorage.getItem(RECENT_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr.slice(0, 6) : [];
    } catch (_) {
      return [];
    }
  }

  function saveRecentSearch(q) {
    var clean = String(q || '').trim().slice(0, 64);
    if (clean.length < 2) return;
    try {
      var list = readRecentSearches().filter(function (x) { return x.toLowerCase() !== clean.toLowerCase(); });
      list.unshift(clean);
      if (win.localStorage) win.localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 6)));
    } catch (_) {}
  }

  function el(tag, cls, text) {
    var n = doc.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null && text !== '') n.textContent = String(text);
    return n;
  }

  /** Safe DOM highlighting using text nodes + <mark> (zero HTML string injection) */
  function appendHighlightedText(parent, text, query) {
    var str = String(text || '');
    var tokens = tokenize(query).filter(function (t) { return t.length >= 2; });
    if (!tokens.length) {
      parent.appendChild(doc.createTextNode(str));
      return;
    }
    var lower = str.toLowerCase();
    var ranges = [];
    tokens.forEach(function (tok) {
      var start = 0;
      while (start < lower.length) {
        var idx = lower.indexOf(tok, start);
        if (idx === -1) break;
        ranges.push([idx, idx + tok.length]);
        start = idx + tok.length;
      }
    });
    if (!ranges.length) {
      parent.appendChild(doc.createTextNode(str));
      return;
    }
    ranges.sort(function (a, b) { return a[0] - b[0]; });
    var merged = [ranges[0]];
    for (var i = 1; i < ranges.length; i += 1) {
      var prev = merged[merged.length - 1];
      if (ranges[i][0] <= prev[1]) {
        if (ranges[i][1] > prev[1]) prev[1] = ranges[i][1];
      } else {
        merged.push(ranges[i]);
      }
    }
    var cursor = 0;
    merged.forEach(function (r) {
      if (r[0] > cursor) parent.appendChild(doc.createTextNode(str.slice(cursor, r[0])));
      parent.appendChild(el('mark', 'cso-ks-mark', str.slice(r[0], r[1])));
      cursor = r[1];
    });
    if (cursor < str.length) parent.appendChild(doc.createTextNode(str.slice(cursor)));
  }

  function fetchIndex() {
    if (cachedItems) return Promise.resolve(cachedItems);
    if (loadingPromise) return loadingPromise;
    loadingPromise = fetch('/api/public/search-index', { credentials: 'same-origin' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (data) {
        cachedItems = Array.isArray(data && data.items) ? data.items : [];
        return cachedItems;
      })
      .catch(function () {
        cachedItems = [];
        return cachedItems;
      })
      .finally(function () {
        loadingPromise = null;
      });
    return loadingPromise;
  }

  function isOverlayOpen() {
    if (!doc) return false;
    var bd = doc.getElementById('cso-ks-backdrop');
    return Boolean(bd && !bd.hidden);
  }

  function closeOverlay() {
    if (!doc) return;
    var bd = doc.getElementById('cso-ks-backdrop');
    if (bd) bd.hidden = true;
    if (doc.body) doc.body.classList.remove('cso-modal-open');
    if (lastFocusedTrigger && typeof lastFocusedTrigger.focus === 'function') {
      try { lastFocusedTrigger.focus(); } catch (_) {}
    }
  }

  function ensureOverlay() {
    var existing = doc.getElementById('cso-ks-backdrop');
    if (existing) return existing;

    var backdrop = el('div', 'cso-ks-backdrop');
    backdrop.id = 'cso-ks-backdrop';
    backdrop.hidden = true;

    var dialog = el('div', 'cso-ks-dialog');
    dialog.id = 'cso-ks-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'cso-search-title');

    var srTitle = el('h2', 'cso-sr-only', 'Instant Search across Common Sense Odisha');
    srTitle.id = 'cso-search-title';

    var inputBar = el('div', 'cso-ks-input-bar');
    inputBar.appendChild(el('span', 'cso-ks-icon', '🔍'));
    var input = el('input', 'cso-ks-input');
    input.id = 'cso-ks-input';
    input.type = 'search';
    input.autocomplete = 'off';
    input.placeholder = 'Search jobs, districts, exams, results, guides… | ଚାକିରି, ଜିଲ୍ଲା, ପରୀକ୍ଷା ଖୋଜନ୍ତୁ…';
    input.setAttribute('aria-label', 'Search jobs, districts, exams, results, and guides');

    var clearBtn = el('button', 'cso-ks-clear', '✕');
    clearBtn.id = 'cso-ks-clear';
    clearBtn.type = 'button';
    clearBtn.hidden = true;
    clearBtn.setAttribute('aria-label', 'Clear search text');
    clearBtn.addEventListener('click', function () {
      activeQuery = '';
      input.value = '';
      clearBtn.hidden = true;
      activeIndex = 0;
      renderResults();
      input.focus();
    });

    var escBtn = el('button', 'cso-ks-esc', 'Esc');
    escBtn.type = 'button';
    escBtn.setAttribute('aria-label', 'Close search');
    escBtn.addEventListener('click', closeOverlay);

    input.addEventListener('input', function () {
      activeQuery = input.value;
      clearBtn.hidden = !activeQuery;
      activeIndex = 0;
      renderResults();
    });

    input.addEventListener('keydown', function (ev) {
      if (ev.key === 'ArrowDown') {
        ev.preventDefault();
        if (lastRenderedItems.length) {
          activeIndex = (activeIndex + 1) % lastRenderedItems.length;
          syncActiveRow();
        }
      } else if (ev.key === 'ArrowUp') {
        ev.preventDefault();
        if (lastRenderedItems.length) {
          activeIndex = (activeIndex - 1 + lastRenderedItems.length) % lastRenderedItems.length;
          syncActiveRow();
        }
      } else if (ev.key === 'Enter') {
        if (lastRenderedItems[activeIndex]) {
          ev.preventDefault();
          if (activeQuery.trim()) saveRecentSearch(activeQuery.trim());
          win.location.assign(safeUrl(lastRenderedItems[activeIndex].url));
        }
      }
    });

    inputBar.append(input, clearBtn, escBtn);

    var tabs = el('div', 'cso-ks-tabs');
    tabs.id = 'cso-ks-tabs';
    tabs.setAttribute('role', 'tablist');

    var resultsHost = el('div', 'cso-ks-results');
    resultsHost.id = 'cso-ks-results';
    resultsHost.setAttribute('role', 'listbox');

    var foot = el('div', 'cso-ks-foot');
    foot.append(
      el('span', '', '↑↓ Navigate · Enter Open · Esc Close'),
      el('span', '', 'Ctrl+K / /')
    );

    dialog.append(srTitle, inputBar, tabs, resultsHost, foot);
    backdrop.appendChild(dialog);
    backdrop.addEventListener('click', function (ev) {
      if (ev.target === backdrop) closeOverlay();
    });
    doc.body.appendChild(backdrop);
    return backdrop;
  }

  function syncActiveRow() {
    var host = doc.getElementById('cso-ks-results');
    if (!host) return;
    host.querySelectorAll('.cso-ks-item').forEach(function (node, idx) {
      var on = idx === activeIndex;
      node.classList.toggle('is-active', on);
      node.setAttribute('aria-selected', on ? 'true' : 'false');
      if (on && typeof node.scrollIntoView === 'function') {
        node.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  function applyQuickChip(text) {
    var inp = doc.getElementById('cso-ks-input');
    var clr = doc.getElementById('cso-ks-clear');
    activeQuery = text;
    activeFilter = 'all';
    activeIndex = 0;
    if (inp) { inp.value = text; inp.focus(); }
    if (clr) clr.hidden = !text;
    renderResults();
  }

  function renderResults() {
    var tabsHost = doc.getElementById('cso-ks-tabs');
    var host = doc.getElementById('cso-ks-results');
    if (!tabsHost || !host) return;
    var orMode = isOdia();

    if (cachedItems === null) {
      host.replaceChildren(el('div', 'cso-ks-empty', orMode ? 'ସର୍ଚ୍ଚ ଇଣ୍ଡେକ୍ସ ଲୋଡ୍ ହେଉଛି…' : 'Loading live search index…'));
      return;
    }

    var out = searchAndRank(cachedItems, activeQuery, activeFilter);

    // Render Category Filter Pills with live counts
    tabsHost.replaceChildren();
    FILTER_TABS.forEach(function (t) {
      var cnt = out.counts[t.key] || 0;
      var b = el('button', 'cso-ks-tab' + (activeFilter === t.key ? ' is-active' : ''), (orMode ? t.or : t.en) + ' (' + cnt + ')');
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', activeFilter === t.key ? 'true' : 'false');
      b.addEventListener('click', function () {
        activeFilter = t.key;
        activeIndex = 0;
        renderResults();
      });
      tabsHost.appendChild(b);
    });

    host.replaceChildren();
    lastRenderedItems = out.results.slice(0, 24);
    if (activeIndex >= lastRenderedItems.length) activeIndex = 0;

    // Empty-query quick suggestions (Recent Searches + Popular Odisha Quick-Filter Chips)
    if (!activeQuery.trim()) {
      var suggWrap = el('div', 'cso-ks-sugg-wrap');
      var recents = readRecentSearches();
      if (recents.length) {
        suggWrap.appendChild(el('div', 'cso-ks-sugg-label', orMode ? 'ସାମ୍ପ୍ରତିକ ସର୍ଚ୍ଚ' : 'Recent Searches'));
        var rRow = el('div', 'cso-ks-chips');
        recents.forEach(function (rq) {
          var cb = el('button', 'cso-ks-chip', '🕒 ' + rq);
          cb.type = 'button';
          cb.addEventListener('click', function () { applyQuickChip(rq); });
          rRow.appendChild(cb);
        });
        suggWrap.appendChild(rRow);
      }
      suggWrap.appendChild(el('div', 'cso-ks-sugg-label', orMode ? 'ଲୋକପ୍ରିୟ ସର୍ଚ୍ଚ' : 'Popular Quick Filters'));
      var pRow = el('div', 'cso-ks-chips');
      POPULAR_CHIPS.forEach(function (pq) {
        var pb = el('button', 'cso-ks-chip', '⚡ ' + pq);
        pb.type = 'button';
        pb.addEventListener('click', function () { applyQuickChip(pq); });
        pRow.appendChild(pb);
      });
      suggWrap.appendChild(pRow);
      host.appendChild(suggWrap);
    }

    if (!lastRenderedItems.length) {
      host.appendChild(el('div', 'cso-ks-empty', orMode
        ? 'କୌଣସି ଫଳାଫଳ ମିଳିଲା ନାହିଁ। ଅନ୍ୟ ଶବ୍ଦ କିମ୍ବା ଜିଲ୍ଲା ନାମ ଲେଖି ଖୋଜନ୍ତୁ।'
        : 'No matching alerts, guides, or hubs found. Try another exam code or Odisha district.'));
      return;
    }

    lastRenderedItems.forEach(function (it, idx) {
      var row = el('a', 'cso-ks-item' + (idx === activeIndex ? ' is-active' : ''));
      row.href = safeUrl(it.url);
      row.setAttribute('role', 'option');
      row.setAttribute('aria-selected', idx === activeIndex ? 'true' : 'false');
      row.addEventListener('click', function () {
        if (activeQuery.trim()) saveRecentSearch(activeQuery.trim());
      });

      var left = el('div', 'cso-ks-item__main');
      var topLine = el('div', 'cso-ks-item__top');
      topLine.appendChild(el('span', 'cso-ks-badge', orMode ? (it.category_label_or || it.category_label_en) : it.category_label_en));
      if (it.deadline_iso) {
        topLine.appendChild(el('span', 'cso-ks-deadline', (it.deadline_label ? it.deadline_label + ': ' : '') + it.deadline_iso));
      }
      left.appendChild(topLine);

      var titleDiv = el('div', 'cso-ks-item__title');
      var primaryTitle = (orMode && it.title_or) ? it.title_or : it.title_en;
      appendHighlightedText(titleDiv, primaryTitle, activeQuery);
      left.appendChild(titleDiv);

      var metaText = [it.org, it.district].filter(Boolean).join(' · ');
      if (metaText) {
        var metaDiv = el('div', 'cso-ks-item__meta');
        appendHighlightedText(metaDiv, metaText, activeQuery);
        left.appendChild(metaDiv);
      }

      var openSpan = el('span', 'cso-ks-item__open', 'Open ↗');
      row.append(left, openSpan);
      host.appendChild(row);
    });
  }

  function openOverlay(triggerEl) {
    if (!doc) return;
    lastFocusedTrigger = triggerEl || doc.activeElement;
    var bd = ensureOverlay();
    bd.hidden = false;
    if (doc.body) doc.body.classList.add('cso-modal-open');
    var inp = doc.getElementById('cso-ks-input');
    if (inp) {
      inp.focus();
      inp.select();
    }
    renderResults();
    fetchIndex().then(renderResults);
  }

  function toggleOverlay(triggerEl) {
    if (isOverlayOpen()) closeOverlay();
    else openOverlay(triggerEl);
  }

  function createTriggerButton() {
    var b = el('button', 'pill cso-ks-trigger');
    b.id = 'cso-ctl-search';
    b.type = 'button';
    b.setAttribute('data-cso-search-trigger', '1');
    b.setAttribute('aria-label', 'Open instant search (Ctrl+K)');
    var ico = el('span', '', '🔍');
    ico.setAttribute('aria-hidden', 'true');
    var lbl = el('span', 'cso-ks-trigger__lbl', 'Search');
    var kbd = el('kbd', 'cso-ks-kbd', 'Ctrl K');
    b.append(ico, ' ', lbl, ' ', kbd);
    b.addEventListener('click', function () { openOverlay(b); });
    return b;
  }

  function ensureHeaderTrigger() {
    if (!doc) return;
    if (doc.getElementById('cso-ctl-search') || doc.querySelector('[data-cso-search-trigger]')) return;
    var ctl = doc.getElementById('ctl');
    if (!ctl) return;
    ctl.insertBefore(createTriggerButton(), ctl.firstChild);
  }

  function bindGlobalShortcuts() {
    if (!doc) return;
    doc.addEventListener('keydown', function (ev) {
      if ((ev.ctrlKey || ev.metaKey) && String(ev.key || '').toLowerCase() === 'k') {
        ev.preventDefault();
        toggleOverlay(doc.activeElement);
        return;
      }
      if (ev.key === 'Escape' && isOverlayOpen()) {
        ev.preventDefault();
        closeOverlay();
        return;
      }
      if (ev.key === '/' && !ev.ctrlKey && !ev.metaKey && !ev.altKey && !isOverlayOpen()) {
        var t = ev.target;
        var tag = t && t.tagName ? t.tagName.toUpperCase() : '';
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;
        ev.preventDefault();
        openOverlay(doc.activeElement);
      }
    });
  }

  function init() {
    ensureHeaderTrigger();
    bindGlobalShortcuts();
    if (typeof setTimeout === 'function') {
      setTimeout(ensureHeaderTrigger, 350);
    }
  }

  if (doc) {
    if (doc.readyState === 'loading') {
      doc.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }

  return {
    version: 'v396',
    RECENT_KEY: RECENT_KEY,
    POPULAR_CHIPS: POPULAR_CHIPS,
    searchAndRank: searchAndRank,
    openOverlay: openOverlay,
    closeOverlay: closeOverlay,
    toggleOverlay: toggleOverlay,
    createTriggerButton: createTriggerButton,
    ensureHeaderTrigger: ensureHeaderTrigger
  };
});
