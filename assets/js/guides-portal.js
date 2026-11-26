/* Common Sense Odisha — Public Informative Guides Controller (v348)
 * Strict CSP-compliant: zero innerHTML, zero inline styles/handlers. */
(function (window, document) {
  'use strict';

  function applyLang(lang) {
    var val = lang === 'or' ? 'or' : 'en';
    document.body.setAttribute('data-guide-lang', val);
    try { localStorage.setItem('cso_guides_lang', val); } catch (_) {}
    document.querySelectorAll('[data-set-guide-lang]').forEach(function (btn) {
      var active = btn.getAttribute('data-set-guide-lang') === val;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
  }

  function initGuidesPage() {
    var saved = 'en';
    try { saved = localStorage.getItem('cso_guides_lang') || 'en'; } catch (_) {}
    applyLang(saved);

    document.querySelectorAll('[data-set-guide-lang]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        applyLang(btn.getAttribute('data-set-guide-lang'));
      });
    });

    // Live instant search filter on /guides/ hub
    var searchInput = document.getElementById('gpHubSearch');
    var grid = document.getElementById('gpGuidesGrid');
    if (searchInput && grid) {
      var cards = Array.prototype.slice.call(grid.querySelectorAll('.gp-card'));
      if (cards.length) {
        searchInput.addEventListener('input', function () {
          var q = String(searchInput.value || '').trim().toLowerCase();
          cards.forEach(function (card) {
            var hay = card.getAttribute('data-search') || '';
            card.hidden = Boolean(q && hay.indexOf(q) === -1);
          });
        });
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGuidesPage);
  } else {
    initGuidesPage();
  }
})(window, document);
