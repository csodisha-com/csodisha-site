/* v178: Offline Fallback Reader (Bookmarks + Mistake Deck).
   Zero innerHTML, zero inline styles, addEventListener only. */
(function () {
  'use strict';

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = String(text);
    return n;
  }

  function readJson(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) { return fallback; }
  }

  function renderBookmarks() {
    var host = document.getElementById('cso-offline-bookmarks');
    if (!host) return;
    var bm = readJson('cso_candidate_bookmarks_v1', { jobs: [], schemes: [], study: [] });
    var items = []
      .concat(Array.isArray(bm.jobs) ? bm.jobs : [])
      .concat(Array.isArray(bm.schemes) ? bm.schemes : [])
      .concat(Array.isArray(bm.study) ? bm.study : []);
    if (!items.length) {
      host.appendChild(el('p', 'cso-offline-sub', 'No saved bookmarks on this device yet.'));
      return;
    }
    items.slice(0, 12).forEach(function (it) {
      var row = el('div', 'cso-offline-item');
      row.appendChild(el('strong', '', it.title || it.slug || 'Saved Item'));
      var meta = [it.organisation || it.category || '', it.last_date ? 'Deadline: ' + it.last_date : ''].filter(Boolean).join(' · ');
      if (meta) row.appendChild(el('span', '', meta));
      host.appendChild(row);
    });
  }

  function renderFlashcards() {
    var host = document.getElementById('cso-offline-flashcards');
    if (!host) return;
    var deck = readJson('cso_study_mistake_deck', []);
    if (!Array.isArray(deck) || !deck.length) {
      host.appendChild(el('p', 'cso-offline-sub', 'No saved revision flashcards yet. Flag concepts in Study Library to revise them offline.'));
      return;
    }
    deck.slice(0, 12).forEach(function (c) {
      var row = el('details', 'cso-offline-item');
      var sum = el('summary', '', (c.exam ? '[' + c.exam + '] ' : '') + (c.q || 'Revision Concept'));
      row.appendChild(sum);
      row.appendChild(el('span', '', c.a || 'Review this concept when back online.'));
      host.appendChild(row);
    });
  }

  function boot() {
    var retryBtn = document.getElementById('cso-offline-retry');
    if (retryBtn) {
      retryBtn.addEventListener('click', function () { window.location.reload(); });
    }
    renderBookmarks();
    renderFlashcards();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
