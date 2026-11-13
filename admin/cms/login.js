(function () {
  'use strict';
  var f = document.getElementById('f');
  var msg = document.getElementById('msg');
  var go = document.getElementById('go');
  var pw = document.getElementById('pw');
  var togglePw = document.getElementById('togglePw');
  var capsHint = document.getElementById('capsHint');
  var rememberMe = document.getElementById('rememberMe');

  var params = new URLSearchParams(location.search);
  var next = params.get('next') || '/admin/';
  if (!/^\/admin(\/|$)/.test(next) || next.indexOf('//') !== -1) next = '/admin/';

  var postHash = '';
  try {
    if (location.hash && /^#module-\d{2}-\d{3}$/.test(location.hash)) {
      postHash = location.hash;
      sessionStorage.setItem('cso_post_login_hash', postHash);
    } else {
      var savedHash = sessionStorage.getItem('cso_post_login_hash') || '';
      if (/^#module-\d{2}-\d{3}$/.test(savedHash)) postHash = savedHash;
    }
  } catch (_e) {}

  function show(t, kind) {
    msg.textContent = t;
    msg.hidden = !t;
    msg.classList.remove('cso-alert-info', 'cso-alert-error');
    if (t) msg.classList.add(kind === 'info' ? 'cso-alert-info' : 'cso-alert-error');
  }

  var reason = params.get('reason');
  if (reason === 'out' || params.get('logged_out') === '1') {
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
      var target = next;
      if (postHash && target.indexOf('#') === -1) target += postHash;
      try { sessionStorage.removeItem('cso_post_login_hash'); } catch (_e) {}
      location.replace(target);
    } catch (err) {
      show(err.message || 'Sign-in failed.', 'error');
      go.disabled = false; go.textContent = 'Sign in';
    }
  });
})();
