/* Master Command Suite — CSP compatibility shims. Loaded first.
   The strict /admin/ policy forbids inline event handlers and inline style attributes
   (script-src 'self'; style-src 'self'). The 241-module renderers' HTML templates therefore
   emit `data-onclick="fn('arg')"` and `data-style="prop: value"` (never the blocked native
   attributes). We apply them WITHOUT eval: style text goes through the CSSOM (allowed), and
   data-onclick text is parsed as a whitelisted call list. No credentials/tokens live here. */
(function () {
  'use strict';

  /* ---- 1. data-style="…" → CSSOM ---- */
  function applyStyleAttr(el) {
    var text = el.getAttribute('data-style');
    if (!text) return;
    el.removeAttribute('data-style');
    text.split(/;(?![^(]*\))/).forEach(function (decl) {
      var i = decl.indexOf(':');
      if (i < 1) return;
      var prop = decl.slice(0, i).trim(), val = decl.slice(i + 1).trim(), pri = '';
      if (/!important$/i.test(val)) { val = val.replace(/\s*!important$/i, ''); pri = 'important'; }
      if (prop && val) { try { el.style.setProperty(prop, val, pri); } catch (_) {} }
    });
  }
  function sweep(root) {
    if (root.nodeType !== 1) return;
    if (root.hasAttribute('data-style')) applyStyleAttr(root);
    var list = root.querySelectorAll('[data-style]');
    for (var i = 0; i < list.length; i++) applyStyleAttr(list[i]);
  }
  new MutationObserver(function (muts) {
    for (var i = 0; i < muts.length; i++) {
      var added = muts[i].addedNodes;
      for (var j = 0; j < added.length; j++) sweep(added[j]);
    }
  }).observe(document, { childList: true, subtree: true });

  /* ---- 2. data-onclick="fn(args); fn2(args)" → delegated, whitelisted dispatcher ---- */
  var ALLOWED = { closeModal: 1, showToast: 1, selectModule: 1, toggleUserStatus: 1, resolveInquiry: 1, launchReplyModal: 1 };
  function splitTop(str, sep) {
    var out = [], cur = '', q = '', esc = false, depth = 0;
    for (var i = 0; i < str.length; i++) {
      var c = str[i];
      if (q) { cur += c; if (esc) esc = false; else if (c === '\\') esc = true; else if (c === q) q = ''; continue; }
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
    if (tok === 'true') return true; if (tok === 'false') return false; if (tok === 'null') return null;
    throw new Error('unsupported argument');
  }
  function run(code) {
    splitTop(code, ';').forEach(function (stmt) {
      stmt = stmt.trim(); if (!stmt) return;
      var m = /^([A-Za-z_$][\w$]*)\(([\s\S]*)\)$/.exec(stmt);
      if (!m || !ALLOWED[m[1]] || typeof window[m[1]] !== 'function') { console.warn('[suite] blocked inline handler:', stmt); return; }
      var args = m[2].trim() ? splitTop(m[2], ',').map(literal) : [];
      window[m[1]].apply(window, args);
    });
  }
  document.addEventListener('click', function (e) {
    var n = e.target && e.target.closest ? e.target.closest('[data-onclick]') : null;
    if (!n) return;
    var code = n.getAttribute('data-onclick');
    try { run(code); } catch (err) { console.warn('[suite] inline handler failed:', code, err); }
  }, true);

  /* ---- 3. sign-out must revoke the server session ---- */
  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target.closest('#btnSignOut, #btnConfirmLockModal') : null;
    if (!t) return;
    try { sessionStorage.clear(); } catch (_) {}
    fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin', keepalive: true, headers: { 'X-CSO-CSRF': '1' } })
      .catch(function () {}).then(function () { window.location.replace('/admin/login?reason=out'); });
  }, true);
})();
