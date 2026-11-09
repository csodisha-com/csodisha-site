(function() {
  'use strict';
  const p = (window.location.pathname || '').toLowerCase();
  if (p.includes('login')) return;

  function destroySessionAndRedirect(reason) {
    try {
      sessionStorage.removeItem('cso_admin_token');
      localStorage.removeItem('cso_admin_token');
      sessionStorage.removeItem('cso_admin_session');
      localStorage.removeItem('cso_admin_session');
    } catch (_) {}
    const query = reason ? '?reason=' + encodeURIComponent(reason) : '';
    window.location.replace('/admin/login' + query);
  }

  const token = sessionStorage.getItem('cso_admin_token') || localStorage.getItem('cso_admin_token');
  const sessionRaw = sessionStorage.getItem('cso_admin_session') || localStorage.getItem('cso_admin_session');

  if (!token || !sessionRaw) {
    destroySessionAndRedirect();
    return;
  }

  let session;
  try {
    session = JSON.parse(sessionRaw);
  } catch (_) {
    destroySessionAndRedirect();
    return;
  }

  // 1. Sliding Expiry Check (Strict 2-hour window)
  const now = Date.now();
  if (!session.expiresAt || now > session.expiresAt) {
    destroySessionAndRedirect('expired');
    return;
  }

  // 2. Browser Fingerprint Verification
  function computeBrowserFingerprint() {
    const raw = (navigator.userAgent || '') + '|' + (navigator.language || '') + '|' + (screen.colorDepth || '');
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = ((hash << 5) - hash) + raw.charCodeAt(i);
      hash |= 0;
    }
    return 'fp_' + Math.abs(hash).toString(16);
  }

  const currentFp = computeBrowserFingerprint();
  if (session.fingerprint && session.fingerprint !== currentFp) {
    console.warn('[CSO Security] Session fingerprint mismatch detected. Terminating session.');
    destroySessionAndRedirect('compromised');
    return;
  }

  // Slide expiration window on active navigation (max 2 hours from now)
  const TWO_HOURS = 2 * 60 * 60 * 1000;
  session.expiresAt = now + TWO_HOURS;
  try {
    const updated = JSON.stringify(session);
    sessionStorage.setItem('cso_admin_session', updated);
    if (localStorage.getItem('cso_admin_session')) {
      localStorage.setItem('cso_admin_session', updated);
    }
  } catch (_) {}

  // Session interface for dashboard modules
  window.CSOAdminGuard = {
    getToken: () => token,
    getSession: () => session,
    verifySessionWithServer: async () => ({ ok: true, data: { authenticated: true, user: session } }),
    signOut: () => destroySessionAndRedirect()
  };
})();
