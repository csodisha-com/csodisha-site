/* Master Command Suite — CSP compatibility & session helpers. Loaded first.
   Strict /admin/ policy: default-src 'self'; script-src 'self'; style-src 'self'.
   Zero inline scripts, zero inline style attributes, zero direct style mutations, zero HTML string injection. */
(function () {
  'use strict';

  var ALLOWED = {
    closeModal: 1,
    showToast: 1,
    selectModule: 1
  };

  function splitTop(str, sep) {
    var out = [], cur = '', q = '', esc = false, depth = 0;
    for (var i = 0; i < str.length; i++) {
      var c = str[i];
      if (q) {
        cur += c;
        if (esc) esc = false;
        else if (c === '\\') esc = true;
        else if (c === q) q = '';
        continue;
      }
      if (c === '"' || c === "'") { q = c; cur += c; continue; }
      if (c === '(') depth++; else if (c === ')') depth--;
      if (c === sep && depth === 0) { out.push(cur); cur = ''; } else cur += c;
    }
    if (cur.trim()) out.push(cur);
    return out;
  }

  function literal(tok) {
    tok = tok.trim();
    var m = /^'((?:[^'\\]|\\.)*)'$/.exec(tok) || /^"((?:[^"\\]|\\.)*)"$/.exec(tok);
    if (m) return m[1].replace(/\\(.)/g, '$1');
    if (/^-?\d+(\.\d+)?$/.test(tok)) return Number(tok);
    if (tok === 'true') return true;
    if (tok === 'false') return false;
    if (tok === 'null') return null;
    throw new Error('unsupported argument');
  }

  function run(code) {
    splitTop(code, ';').forEach(function (stmt) {
      stmt = stmt.trim();
      if (!stmt) return;
      var m = /^([A-Za-z_$][\w$]*)\(([\s\S]*)\)$/.exec(stmt);
      if (!m || !ALLOWED[m[1]] || typeof window[m[1]] !== 'function') return;
      var args = m[2].trim() ? splitTop(m[2], ',').map(literal) : [];
      window[m[1]].apply(window, args);
    });
  }

  document.addEventListener('click', function (e) {
    var n = e.target && e.target.closest ? e.target.closest('[data-onclick]') : null;
    if (!n) return;
    var code = n.getAttribute('data-onclick');
    try { run(code); } catch (_) {}
  }, true);

  /* Sign-out revokes the server session cleanly */
  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target.closest('#btnSignOut, #btnConfirmLockModal') : null;
    if (!t) return;
    try {
      localStorage.removeItem('cso_active_module_id');
      sessionStorage.removeItem('cso_post_login_hash');
      sessionStorage.clear();
    } catch (_) {}
    fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin', keepalive: true, headers: { 'X-CSO-CSRF': '1' } })
      .catch(function () {})
      .then(function () { window.location.replace('/admin/login?reason=out'); });
  }, true);
})();
