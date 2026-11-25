/* Common Sense Odisha — Candidate Hub Pre-Hydration Theme & Auth Guard (v305)
 * Synchronizes canonical 4-theme attributes before paint and guards unauthenticated
 * visits with a single-hop replace redirect. Strict CSP compliant. */
(function () {
  'use strict';

  var VALID_THEMES = ['system', 'dark', 'reading', 'utkal-bharat'];
  try {
    var rawTheme = localStorage.getItem('cso_portal_theme') || 'system';
    if (rawTheme === 'odisha') rawTheme = 'utkal-bharat';
    var themeKey = VALID_THEMES.indexOf(rawTheme) !== -1 ? rawTheme : 'system';
    var root = document.documentElement;
    root.setAttribute('data-cso-theme', themeKey);
    root.setAttribute('data-theme', themeKey === 'utkal-bharat' ? 'odisha' : themeKey);
    if (themeKey === 'dark') {
      root.setAttribute('data-cso-resolved-mode', 'dark');
    } else if (themeKey === 'system') {
      var prefersDark = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.setAttribute('data-cso-resolved-mode', prefersDark ? 'dark' : 'light');
    } else {
      root.setAttribute('data-cso-resolved-mode', 'light');
    }
  } catch (e) {}

  try {
    var raw = localStorage.getItem('cso_candidate_session_v1') || localStorage.getItem('cso_candidate_profile');
    if (!raw) {
      window.location.replace('/login.html?redirect=' + encodeURIComponent('/student-dashboard/'));
      return;
    }
    var session = JSON.parse(raw);
    if (!session || (!session.isAuthenticated && !session.email && !session.id)) {
      localStorage.removeItem('cso_candidate_session_v1');
      localStorage.removeItem('cso_candidate_profile');
      localStorage.removeItem('cso_auth_token');
      window.location.replace('/login.html?redirect=' + encodeURIComponent('/student-dashboard/'));
      return;
    }

    // Hydrate candidate identity immediately to eliminate placeholder name flash
    var displayName = String(session.fullName || session.name || '').trim();
    var displayDistrict = String(session.district || '').trim();
    if (displayName) {
      ['bp-side-name', 'bp-top-name'].forEach(function (id) {
        var node = document.getElementById(id);
        if (node) node.textContent = displayName;
      });
    }
    if (displayDistrict) {
      ['bp-side-district', 'bp-top-district'].forEach(function (id) {
        var node = document.getElementById(id);
        if (node) node.textContent = displayDistrict;
      });
    }
  } catch (e) {
    window.location.replace('/login.html?redirect=' + encodeURIComponent('/student-dashboard/'));
  }
})();
