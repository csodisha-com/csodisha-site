(function () {
  'use strict';
  var f = document.getElementById('f'), msg = document.getElementById('msg'), go = document.getElementById('go');
  var params = new URLSearchParams(location.search);
  var next = params.get('next') || '/admin/';
  if (!/^\/admin(\/|$)/.test(next) || next.indexOf('//') !== -1) next = '/admin/';
  function show(t) { msg.textContent = t; msg.hidden = !t; }
  if (params.get('reason')) show('You have been signed out.');
  f.addEventListener('submit', async function (e) {
    e.preventDefault(); show('');
    var email = f.email.value.trim().toLowerCase(), password = f.password.value;
    if (!email || !password) return show('Enter your email and password.');
    go.disabled = true; go.textContent = 'Signing in…';
    try {
      var r = await fetch('/api/auth/login', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, password: password })
      });
      var d = await r.json().catch(function () { return {}; });
      if (!r.ok) throw new Error(d.error || 'Sign-in failed.');
      var s = await fetch('/api/admin/session', { credentials: 'same-origin' });
      if (!s.ok) {
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
        throw new Error('This account does not have staff access.');
      }
      location.replace(next);
    } catch (err) {
      show(err.message || 'Sign-in failed.');
      go.disabled = false; go.textContent = 'Sign in';
    }
  });
})();
