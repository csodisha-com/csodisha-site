/* Legacy console helper. Access control is enforced SERVER-SIDE by the Worker
   (users.role + HttpOnly session cookie); this file holds no credentials or tokens
   and performs no client-side authorisation. It only wires sign-out to the server. */
(function () {
  'use strict';
  function serverLogout() {
    try { sessionStorage.removeItem('cso_admin_token'); localStorage.removeItem('cso_admin_token'); } catch (_) {}
    return fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin', keepalive: true }).catch(function () {});
  }
  function leave(reason) {
    serverLogout().then(function () { window.location.replace('/admin/login' + (reason ? '?reason=' + reason : '')); });
  }
  window.CSOAdminGuard = {
    getToken: function () { return ''; },
    getSession: function () { return null; },
    verifySessionWithServer: function () {
      return fetch('/api/admin/session', { credentials: 'same-origin' })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: { authenticated: r.ok, user: d.user || null } }; }); })
        .catch(function () { return { ok: false, data: { authenticated: false } }; });
    },
    signOut: function () { leave(); }
  };
  // The legacy console's own sign-out / lock buttons only clear browser storage;
  // also revoke the server session when they are used.
  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest && e.target.closest('#btnSignOut, #btnConfirmLockModal');
    if (t) serverLogout();
  }, true);
})();
