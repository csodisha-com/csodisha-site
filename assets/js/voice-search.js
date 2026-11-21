/* v176: Reusable CSP-Compliant Voice Search (English en-IN + Odia or-IN).
   Zero innerHTML, zero inline styles, addEventListener only. */
(function (root) {
  'use strict';

  function getSpeechRecognitionCtor() {
    if (typeof window === 'undefined') return null;
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }

  function isVoiceSupported() {
    return typeof getSpeechRecognitionCtor() === 'function';
  }

  function resolveSpeechLang(storage) {
    var st = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    try {
      var studyMode = st && st.getItem('cso_study_lang_mode');
      if (studyMode === 'or') return 'or-IN';
      var pref = st && st.getItem('cso_lang_pref');
      if (pref === 'or') return 'or-IN';
      var csoLang = st && st.getItem('cso_lang');
      if (csoLang === 'or') return 'or-IN';
    } catch (_) {}
    if (typeof document !== 'undefined' && document.documentElement && document.documentElement.lang === 'or') {
      return 'or-IN';
    }
    return 'en-IN';
  }

  function bindVoiceControl(btn, input) {
    if (!btn || !input || btn.dataset.csoVoiceBound === '1') return;
    btn.dataset.csoVoiceBound = '1';
    var Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      btn.hidden = true;
      return;
    }

    var activeRec = null;
    var defaultText = btn.textContent || '🎙️';

    function resetState() {
      activeRec = null;
      btn.classList.remove('is-listening');
      btn.setAttribute('aria-pressed', 'false');
      btn.setAttribute('aria-label', 'Voice Search');
      btn.textContent = defaultText;
    }

    btn.addEventListener('click', function () {
      if (activeRec) {
        try { activeRec.stop(); } catch (_) {}
        resetState();
        return;
      }
      try {
        var rec = new Ctor();
        activeRec = rec;
        rec.lang = resolveSpeechLang();
        rec.interimResults = false;
        rec.maxAlternatives = 1;
        btn.classList.add('is-listening');
        btn.setAttribute('aria-pressed', 'true');
        btn.setAttribute('aria-label', 'Listening…');
        btn.textContent = 'Listening…';

        rec.addEventListener('result', function (ev) {
          var transcript = '';
          if (ev && ev.results && ev.results[0] && ev.results[0][0]) {
            transcript = String(ev.results[0][0].transcript || '').trim();
          }
          if (transcript) {
            input.value = transcript;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.focus();
          }
        });
        rec.addEventListener('end', resetState);
        rec.addEventListener('error', resetState);
        rec.start();
      } catch (_) {
        resetState();
      }
    });
  }

  function attachVoiceSearch() {
    if (typeof document === 'undefined') return;
    var supported = isVoiceSupported();

    // 1. Homepage hero search (#smic + #cso-ask-input)
    var smic = document.getElementById('smic');
    var homeInput = document.getElementById('cso-ask-input');
    if (smic && homeInput) {
      if (!supported) smic.hidden = true;
      else bindVoiceControl(smic, homeInput);
    }

    // 2. Explorer top search bars
    if (!supported) return;
    var selectors = [
      '#directory-search',
      '#schemes-topbar-search',
      '#community-topbar-search',
      '#about-topbar-search',
      '#cso-subpage-search'
    ];
    selectors.forEach(function (sel) {
      var input = document.querySelector(sel);
      if (!input || !input.parentNode) return;
      var parent = input.parentNode;
      if (parent.querySelector('.cso-voice-btn')) return;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cso-voice-btn';
      btn.setAttribute('aria-label', 'Voice Search');
      btn.setAttribute('aria-pressed', 'false');
      btn.title = 'Voice Search (English / ଓଡ଼ିଆ)';
      btn.textContent = '🎙️';
      var clearBtn = parent.querySelector('.clear-search, .cso-dir-clear');
      if (clearBtn) parent.insertBefore(btn, clearBtn);
      else parent.appendChild(btn);
      bindVoiceControl(btn, input);
    });
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', attachVoiceSearch);
    } else {
      attachVoiceSearch();
    }
  }

  root.CSOVoiceSearch = {
    isVoiceSupported: isVoiceSupported,
    resolveSpeechLang: resolveSpeechLang,
    bindVoiceControl: bindVoiceControl,
    attachVoiceSearch: attachVoiceSearch
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.CSOVoiceSearch;
})(typeof window !== 'undefined' ? window : globalThis);
