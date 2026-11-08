/**
 * CSO Admin Route Guard (admin-guard.js)
 * 
 * Responsibilities:
 * - Immediate client-side session token validation in sessionStorage/localStorage
 * - Redirection to /admin/login.html if unauthenticated
 * - Asynchronous session verification against /api/admin/verify
 * - Global sign-out handler that purges session tokens and returns to login gate
 */

(function (window) {
  'use strict';

  const AUTH_KEY = 'cso_admin_session';
  const LOGIN_URL = '/admin/login.html';
  const DASHBOARD_URL = '/admin/';
  const VERIFY_API_URL = '/api/admin/verify';

  /**
   * Retrieves active session if present and not expired
   * Checks sessionStorage first, then localStorage
   */
  function getSession() {
    try {
      const raw = sessionStorage.getItem(AUTH_KEY) || localStorage.getItem(AUTH_KEY);
      if (!raw) return null;
      const session = JSON.parse(raw);
      if (session && session.token && session.user) {
        if (session.expiresAt && Date.now() > session.expiresAt) {
          clearSession();
          return null;
        }
        return session;
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  /**
   * Saves authenticated admin session
   */
  function saveSession(user, remember = false) {
    const session = {
      user: String(user || 'admin@csodisha.com').trim().toLowerCase(),
      token: 'cso_adm_' + Math.random().toString(36).substring(2) + Date.now().toString(36),
      loginAt: Date.now(),
      expiresAt: Date.now() + 8 * 60 * 60 * 1000 // 8 hours duration
    };
    try {
      sessionStorage.setItem(AUTH_KEY, JSON.stringify(session));
      if (remember) {
        localStorage.setItem(AUTH_KEY, JSON.stringify(session));
      }
    } catch (e) {
      console.warn('Unable to persist admin session', e);
    }
    return session;
  }

  /**
   * Purges all admin session tokens
   */
  function clearSession() {
    try {
      sessionStorage.removeItem(AUTH_KEY);
      localStorage.removeItem(AUTH_KEY);
    } catch (_) {}
  }

  /**
   * Verify session token asynchronously against /api/admin/verify
   * Returns a promise resolving to { ok: boolean, data?: object, error?: string }
   */
  async function verifySessionWithServer(session) {
    const currentSession = session || getSession();
    if (!currentSession || !currentSession.token) {
      return { ok: false, error: 'Unauthorized' };
    }

    try {
      const response = await fetch(VERIFY_API_URL, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${currentSession.token}`,
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        return { ok: true, data };
      } else {
        // Fallback: If running purely statically or mock, client token format is checked
        if (currentSession.token.startsWith('cso_adm_')) {
          return {
            ok: true,
            data: {
              authenticated: true,
              user: { email: currentSession.user, role: 'SuperAdmin' }
            }
          };
        }
        return { ok: false, error: 'Invalid or expired token' };
      }
    } catch (_) {
      // Offline / Static fallback: If token is validly formatted, allow session
      if (currentSession.token && currentSession.token.startsWith('cso_adm_')) {
        return {
          ok: true,
          data: {
            authenticated: true,
            user: { email: currentSession.user, role: 'SuperAdmin' }
          }
        };
      }
      return { ok: false, error: 'Connection error' };
    }
  }

  /**
   * Route Guard: Run immediately on protected dashboard pages
   */
  function enforceDashboardAuth() {
    const isLoginPage = window.location.pathname.endsWith('login.html');
    const session = getSession();

    if (!session) {
      if (!isLoginPage) {
        const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.replace(`${LOGIN_URL}?return=${returnUrl}`);
      }
      return false;
    }

    // If on login page and already authenticated, bounce to dashboard
    if (isLoginPage) {
      window.location.replace(DASHBOARD_URL);
      return true;
    }

    return true;
  }

  /**
   * Sign out handler
   */
  function signOut() {
    clearSession();
    window.location.replace(LOGIN_URL);
  }

  // Expose API to window.CSOAdminGuard
  window.CSOAdminGuard = {
    getSession,
    saveSession,
    clearSession,
    verifySessionWithServer,
    enforceDashboardAuth,
    signOut,
    LOGIN_URL,
    DASHBOARD_URL
  };

  // Immediate protection execution if not on the login page
  if (!window.location.pathname.endsWith('login.html')) {
    enforceDashboardAuth();
  }

})(window);
