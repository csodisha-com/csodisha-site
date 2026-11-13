(function () {
  'use strict';
  var f = document.getElementById('f');
  var msg = document.getElementById('msg');
  var go = document.getElementById('go');
  var pw = document.getElementById('pw');
  var togglePw = document.getElementById('togglePw');
  var capsHint = document.getElementById('capsHint');
  var rememberMe = document.getElementById('rememberMe');
  var themeMenuWrap = document.getElementById('themeMenuWrap');
  var themeMenuBtn = document.getElementById('themeMenuBtn');
  var themeMenuPopover = document.getElementById('themeMenuPopover');
  var THEME_ORDER = ['apex', 'volt', 'cobalt', 'lime'];

  function normalizeTheme(raw) {
    if (raw === 'apex' || raw === 'volt' || raw === 'cobalt' || raw === 'lime') return raw;
    if (raw === 'light') return 'cobalt';
    return 'apex';
  }

  function readStoredTheme() {
    try {
      return normalizeTheme(localStorage.getItem('cso_studio_theme'));
    } catch (_e) {
      return 'apex';
    }
  }

  function applyTheme(theme) {
    var safe = normalizeTheme(theme);
    document.documentElement.dataset.theme = safe;
    if (themeMenuPopover) {
      themeMenuPopover.querySelectorAll('.cso-theme-option').forEach(function (opt) {
        opt.setAttribute('aria-checked', opt.getAttribute('data-theme-value') === safe ? 'true' : 'false');
      });
    }
    return safe;
  }

  function closeThemePopover() {
    if (themeMenuPopover) themeMenuPopover.hidden = true;
    if (themeMenuBtn) themeMenuBtn.setAttribute('aria-expanded', 'false');
  }

  function setTheme(theme) {
    var safe = applyTheme(theme);
    try { localStorage.setItem('cso_studio_theme', safe); } catch (_e) {}
    return safe;
  }

  function cycleTheme() {
    var cur = normalizeTheme(document.documentElement.dataset.theme);
    var idx = THEME_ORDER.indexOf(cur);
    return setTheme(THEME_ORDER[(idx + 1) % THEME_ORDER.length]);
  }

  applyTheme(readStoredTheme());
  if (themeMenuBtn && themeMenuPopover) {
    themeMenuBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var nextHidden = !themeMenuPopover.hidden;
      themeMenuPopover.hidden = nextHidden;
      themeMenuBtn.setAttribute('aria-expanded', String(!nextHidden));
    });
    themeMenuPopover.querySelectorAll('.cso-theme-option').forEach(function (opt) {
      opt.addEventListener('click', function () {
        setTheme(opt.getAttribute('data-theme-value'));
        closeThemePopover();
      });
    });
    document.addEventListener('click', function (e) {
      if (!themeMenuPopover.hidden && themeMenuWrap && !themeMenuWrap.contains(e.target)) {
        closeThemePopover();
      }
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      closeThemePopover();
    } else if (e.altKey && !e.ctrlKey && !e.metaKey && (e.key === 't' || e.key === 'T')) {
      var tag = e.target && e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target && e.target.isContentEditable)) return;
      e.preventDefault();
      cycleTheme();
    }
  });

  var params = new URLSearchParams(location.search);
  var next = params.get('next') || '/admin/';
  if (!/^\/admin(\/|$)/.test(next) || next.indexOf('//') !== -1) next = '/admin/';

  function show(t, kind) {
    msg.textContent = t;
    msg.hidden = !t;
    msg.classList.remove('cso-alert-info', 'cso-alert-error');
    if (t) msg.classList.add(kind === 'info' ? 'cso-alert-info' : 'cso-alert-error');
  }

  var reason = params.get('reason');
  if (reason === 'out' || params.get('logged_out') === '1') {
    try {
      localStorage.removeItem('cso_active_module_id');
      sessionStorage.removeItem('cso_post_login_hash');
    } catch (_e) {}
    show('You have been signed out.', 'info');
  } else if (reason === 'locked') {
    show('Session locked or expired. Please sign in again.', 'error');
  } else if (reason) {
    show('You have been signed out.', 'info');
  }

  if (togglePw && pw) {
    togglePw.addEventListener('click', function () {
      var isHidden = pw.type === 'password';
      pw.type = isHidden ? 'text' : 'password';
      togglePw.textContent = isHidden ? 'Hide' : 'Show';
      togglePw.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
    });
  }

  if (pw && capsHint) {
    var checkCaps = function (e) {
      var on = !!(e.getModifierState && e.getModifierState('CapsLock'));
      capsHint.hidden = !on;
    };
    pw.addEventListener('keydown', checkCaps);
    pw.addEventListener('keyup', checkCaps);
    pw.addEventListener('blur', function () { capsHint.hidden = true; });
  }

  f.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (go.disabled) return;
    show('');
    var email = f.email.value.trim().toLowerCase(), password = f.password.value;
    if (!email || !password) return show('Enter your email and password.', 'error');
    go.disabled = true; go.textContent = 'Signing in…';
    try {
      var r = await fetch('/api/auth/login', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          password: password,
          remember_me: !!(rememberMe && rememberMe.checked)
        })
      });
      var d = await r.json().catch(function () { return {}; });
      if (!r.ok) throw new Error(d.error || 'Sign-in failed.');
      var s = await fetch('/api/admin/session', { credentials: 'same-origin' });
      if (!s.ok) {
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
        throw new Error('This account does not have staff access.');
      }
      try {
        localStorage.removeItem('cso_active_module_id');
        sessionStorage.removeItem('cso_post_login_hash');
      } catch (_e) {}
      var baseNext = (next || '/admin/').split('#')[0] || '/admin/';
      location.replace(baseNext + '#module-01-001');
    } catch (err) {
      show(err.message || 'Sign-in failed.', 'error');
      go.disabled = false; go.textContent = 'Sign in';
    }
  });
})();
