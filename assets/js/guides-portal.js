/* Common Sense Odisha — Public Informative Guides Controller (v366)
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

  function copyTextFallback(text) {
    return new Promise(function (resolve, reject) {
      try {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.className = 'cso-sr-only';
        ta.setAttribute('readonly', '');
        ta.setAttribute('aria-hidden', 'true');
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        var ok = document.execCommand('copy');
        document.body.removeChild(ta);
        if (ok) resolve();
        else reject(new Error('Clipboard copy failed'));
      } catch (err) {
        reject(err);
      }
    });
  }

  function copyGuideUrl(url) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      return navigator.clipboard.writeText(url).catch(function () {
        return copyTextFallback(url);
      });
    }
    return copyTextFallback(url);
  }

  function initShareControls() {
    if (typeof navigator.share === 'function') {
      document.querySelectorAll('[data-native-share]').forEach(function (btn) {
        btn.hidden = false;
      });
    }

    document.addEventListener('click', function (ev) {
      var copyBtn = ev.target && ev.target.closest ? ev.target.closest('[data-copy-guide-url]') : null;
      if (copyBtn) {
        var url = copyBtn.getAttribute('data-copy-guide-url') || window.location.href;
        var origText = copyBtn.getAttribute('data-orig-label') || copyBtn.textContent || 'Copy Link';
        copyBtn.setAttribute('data-orig-label', origText);
        var shareBar = copyBtn.closest ? copyBtn.closest('.gp-share-bar') : null;
        var liveNode = shareBar ? shareBar.querySelector('.gp-share-live') : null;
        copyGuideUrl(url).then(function () {
          copyBtn.textContent = '\u2713 Copied!';
          copyBtn.classList.add('is-copied');
          if (liveNode) liveNode.textContent = 'Guide link copied to clipboard.';
          if (copyBtn._copyTimer) window.clearTimeout(copyBtn._copyTimer);
          copyBtn._copyTimer = window.setTimeout(function () {
            copyBtn.textContent = origText;
            copyBtn.classList.remove('is-copied');
          }, 2200);
        }).catch(function () {
          if (liveNode) liveNode.textContent = 'Copy unavailable. Please copy the address bar URL.';
        });
        return;
      }

      var printBtn = ev.target && ev.target.closest ? ev.target.closest('[data-cso-print-btn]') : null;
      if (printBtn) {
        window.print();
        return;
      }

      var nativeBtn = ev.target && ev.target.closest ? ev.target.closest('[data-native-share]') : null;
      if (nativeBtn && typeof navigator.share === 'function') {
        var shareTitle = nativeBtn.getAttribute('data-share-title') || document.title;
        var shareText = nativeBtn.getAttribute('data-share-text') || shareTitle;
        var shareUrl = nativeBtn.getAttribute('data-share-url') || window.location.href;
        navigator.share({ title: shareTitle, text: shareText, url: shareUrl }).catch(function () {});
      }
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

    initShareControls();

    // Collapsible Table of Contents on mobile (<= 960px), expanded & sticky on desktop
    var isMobileMq = window.matchMedia && window.matchMedia('(max-width: 960px)');
    var tocDetailsList = Array.prototype.slice.call(document.querySelectorAll('.gp-toc-details'));
    if (tocDetailsList.length && isMobileMq) {
      var syncTocState = function () {
        var compact = isMobileMq.matches;
        tocDetailsList.forEach(function (det) {
          det.open = !compact;
        });
      };
      syncTocState();
      tocDetailsList.forEach(function (det) {
        det.querySelectorAll('a[href^="#"]').forEach(function (link) {
          link.addEventListener('click', function () {
            if (isMobileMq.matches) det.open = false;
          });
        });
      });
    }

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
