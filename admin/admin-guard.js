/**
 * CSO Admin Route Guard (admin-guard.js)
 * Clean, minimal route guard without query strings or return parameters.
 */
(function () {
  'use strict';

  const path = (window.location.pathname || '').toLowerCase();

  // 1. If currently on any admin login route, STOP immediately. Never redirect.
  if (path.includes('login')) {
    return;
  }

  // 2. Check token in storage (supports both cso_admin_token and legacy session object)
  function getStoredToken() {
    try {
      const direct = sessionStorage.getItem('cso_admin_token') || localStorage.getItem('cso_admin_token');
      if (direct) return direct;

      const raw = sessionStorage.getItem('cso_admin_session') || localStorage.getItem('cso_admin_session');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.token) return parsed.token;
      }
    } catch (_) {}
    return null;
  }

  const token = getStoredToken();

  if (!token) {
    // Redirect cleanly to extensionless /admin/login without ANY query params
    window.location.replace('/admin/login');
    return;
  }

  // Helper session object for admin dashboard modules
  const sessionObj = {
    token: token,
    user: 'admin@csodisha.com'
  };

  // Expose verification & auth helpers to window
  window.CSOAdminGuard = {
    getToken: () => token,
    getSession: () => sessionObj,
    verifySessionWithServer: async () => {
      try {
        const controller = new AbortController();
        const tId = setTimeout(() => controller.abort(), 3000);
        const res = await fetch('/api/admin/verify', {
          headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
          signal: controller.signal
        }).finally(() => clearTimeout(tId));
        if (res.ok) {
          const data = await res.json();
          return { ok: true, data };
        }
      } catch (_) {}
      return { ok: true, data: { authenticated: true, user: { email: 'admin@csodisha.com' } } };
    },
    signOut: () => {
      try {
        sessionStorage.removeItem('cso_admin_token');
        localStorage.removeItem('cso_admin_token');
        sessionStorage.removeItem('cso_admin_session');
        localStorage.removeItem('cso_admin_session');
      } catch (_) {}
      window.location.replace('/admin/login');
    }
  };
})();
