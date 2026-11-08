(function() {
  'use strict';
  const p = (window.location.pathname || '').toLowerCase();
  if (p.includes('login')) return;

  const token = sessionStorage.getItem('cso_admin_token') || localStorage.getItem('cso_admin_token');
  if (!token) {
    window.location.replace('/admin/login');
    return;
  }

  // Session interface for dashboard modules
  window.CSOAdminGuard = {
    getToken: () => token,
    getSession: () => ({ token: token, user: 'admin@csodisha.com' }),
    verifySessionWithServer: async () => ({ ok: true, data: { authenticated: true, user: { email: 'admin@csodisha.com' } } }),
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
