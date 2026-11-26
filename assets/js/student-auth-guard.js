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

  function hydrateIdentity(session) {
    if (!session || typeof session !== 'object') return;
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
  }

  function clearClientSessionAndRedirect() {
    try {
      localStorage.removeItem('cso_candidate_session_v1');
      localStorage.removeItem('cso_candidate_profile');
      localStorage.removeItem('cso_auth_token');
    } catch (e) {}
    window.location.replace('/login.html?redirect=' + encodeURIComponent('/student-dashboard/'));
  }

  try {
    var raw = localStorage.getItem('cso_candidate_session_v1') || localStorage.getItem('cso_candidate_profile');
    if (raw) {
      var cachedSession = JSON.parse(raw);
      if (cachedSession && (cachedSession.isAuthenticated || cachedSession.email || cachedSession.id)) {
        hydrateIdentity(cachedSession);
      }
    }
  } catch (e) {}

  // Authoritative HttpOnly cookie / D1 session check (supports Google OAuth & cookie-only logins)
  if (typeof fetch === 'function') {
    fetch('/api/auth/me', { credentials: 'include', cache: 'no-store' })
      .then(function (res) {
        if (res.status === 401) {
          clearClientSessionAndRedirect();
          return null;
        }
        return res.json().catch(function () { return null; }).then(function (data) {
          if (!data) return;
          if (res.ok && (data.authenticated || data.ok || data.user)) {
            var userObj = data.user || data;
            var payload = Object.assign({}, userObj, { isAuthenticated: true });
            try {
              localStorage.setItem('cso_candidate_session_v1', JSON.stringify(payload));
              localStorage.setItem('cso_candidate_profile', JSON.stringify(payload));
            } catch (e) {}
            hydrateIdentity(payload);
            return;
          }
          if (data.authenticated === false) {
            clearClientSessionAndRedirect();
          }
        });
      })
      .catch(function () {
        // Network error / offline: do not bounce authenticated users prematurely
      });
  }
})();
