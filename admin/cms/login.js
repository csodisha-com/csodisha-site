(function () {
  'use strict';
  var f = document.getElementById('f');
  var msg = document.getElementById('msg');
  var go = document.getElementById('go');
  var pw = document.getElementById('pw');
  var togglePw = document.getElementById('togglePw');
  var capsHint = document.getElementById('capsHint');
  var rememberMe = document.getElementById('rememberMe');
  var twofa = document.getElementById('twofa');
  var twofaBlock = document.getElementById('twofaBlock');
  var twofaChallengeNote = document.getElementById('twofaChallengeNote');
  var otpRow = document.getElementById('otpRow');
  var sendOtp = document.getElementById('sendOtp');
  var otpStatus = document.getElementById('otpStatus');
  var passwordStep = document.getElementById('passwordStep');
  var emailOtpStep = document.getElementById('emailOtpStep');
  var emailOtpMasked = document.getElementById('emailOtpMasked');
  var emailOtpInput = document.getElementById('emailOtpInput');
  var emailOtpTimer = document.getElementById('emailOtpTimer');
  var emailOtpResendBtn = document.getElementById('emailOtpResendBtn');
  var emailOtpBackBtn = document.getElementById('emailOtpBackBtn');
  var pendingEmailOtp = null;
  var pendingTotpToken = null;
  var emailOtpTimerInterval = null;
  var emailOtpResendInterval = null;
  var themeMenuWrap = document.getElementById('themeMenuWrap');
  var themeMenuBtn = document.getElementById('themeMenuBtn');
  var themeMenuPopover = document.getElementById('themeMenuPopover');
  var PORTAL_THEMES = [
    { key: 'system', label: 'System', fullLabel: 'System (Auto Light/Dark)' },
    { key: 'dark', label: 'Dark', fullLabel: 'Dark Night' },
    { key: 'reading', label: 'Reading', fullLabel: 'Reading Mode' },
    { key: 'utkal-bharat', label: 'Odisha & Bharat', fullLabel: 'Odisha & Bharat' }
  ];
  var THEME_ORDER = PORTAL_THEMES.map(function (t) { return t.key; });

  function normalizeTheme(raw) {
    var val = String(raw || '').toLowerCase();
    if (THEME_ORDER.indexOf(val) !== -1) return val;
    return 'system';
  }

  function resolveEffectiveMode(themeKey) {
    if (themeKey === 'dark') return 'dark';
    if (themeKey === 'reading' || themeKey === 'utkal-bharat') return 'light';
    try {
      return (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
    } catch (_e) {
      return 'light';
    }
  }

  function readStoredTheme() {
    try {
      return normalizeTheme(localStorage.getItem('cso_portal_theme'));
    } catch (_e) {
      return 'system';
    }
  }

  function applyTheme(theme) {
    var safe = normalizeTheme(theme);
    document.documentElement.setAttribute('data-theme', safe === 'utkal-bharat' ? 'odisha' : safe);
    document.documentElement.setAttribute('data-cso-theme', safe);
    document.documentElement.setAttribute('data-cso-resolved-mode', resolveEffectiveMode(safe));
    if (themeMenuBtn) {
      var cur = PORTAL_THEMES.find(function (t) { return t.key === safe; }) || PORTAL_THEMES[0];
      themeMenuBtn.textContent = '';
      var sw = document.createElement('span');
      sw.className = 'cso-theme-swatch is-' + cur.key;
      sw.setAttribute('aria-hidden', 'true');
      themeMenuBtn.appendChild(sw);
      themeMenuBtn.appendChild(document.createTextNode(' ' + cur.label + ' ▾'));
      themeMenuBtn.title = 'Theme: ' + cur.fullLabel + ' (Alt+T)';
    }
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
    try { localStorage.setItem('cso_portal_theme', safe); } catch (_e) {}
    return safe;
  }

  function cycleTheme() {
    var cur = normalizeTheme(document.documentElement.getAttribute('data-cso-theme'));
    var idx = THEME_ORDER.indexOf(cur);
    return setTheme(THEME_ORDER[(idx + 1) % THEME_ORDER.length]);
  }

  window.addEventListener('storage', function (e) {
    if (e.key === 'cso_portal_theme' && e.newValue && THEME_ORDER.indexOf(e.newValue) !== -1) {
      applyTheme(e.newValue);
    }
  });

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
  var rawNext = params.get('next') || params.get('redirect') || params.get('returnTo') || '/admin/';
  var next = String(rawNext || '/admin/').split('#')[0] || '/admin/';
  if (!/^\/admin(\/|$)/.test(next) || next.indexOf('//') !== -1 || /^\/admin\/(?:index\.html|legacy(?:\.html)?|portal(?:\.html)?|login(?:\.html)?)$/i.test(next)) {
    next = '/admin/';
  }

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
      localStorage.removeItem('cso_admin_active');
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


  /* Push OTP (Telegram / Email) with 60-second resend countdown */
  var otpTimer = null;
  function setOtpStatus(t, bad) {
    if (!otpStatus) return;
    otpStatus.textContent = t || '';
    otpStatus.classList.toggle('is-bad', !!bad);
  }
  function startOtpCountdown(seconds) {
    clearInterval(otpTimer);
    var left = seconds;
    sendOtp.disabled = true;
    sendOtp.textContent = 'Resend in ' + left + 's';
    otpTimer = setInterval(function () {
      left -= 1;
      if (left <= 0) {
        clearInterval(otpTimer);
        sendOtp.disabled = false;
        sendOtp.textContent = 'Send OTP (Telegram / Email)';
        return;
      }
      sendOtp.textContent = 'Resend in ' + left + 's';
    }, 1000);
  }
  if (sendOtp) {
    sendOtp.addEventListener('click', async function () {
      var email = f.email.value.trim().toLowerCase(), password = f.password.value;
      if (!email || !password) { setOtpStatus('Enter your email and password first.', true); return; }
      sendOtp.disabled = true;
      setOtpStatus('Sending…');
      try {
        var r = await fetch('/api/admin/auth/send-otp', {
          method: 'POST', credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email, password: password })
        });
        var d = await r.json().catch(function () { return {}; });
        if (!r.ok) {
          setOtpStatus(d.error || 'Could not send OTP.', true);
          if (r.status === 429 && d.retry_after) startOtpCountdown(Number(d.retry_after) || 60);
          else sendOtp.disabled = false;
          return;
        }
        if (d.requires_email_otp && d.challenge_id) {
          setOtpStatus('');
          sendOtp.disabled = false;
          enterEmailOtpStep(d);
          return;
        }
        setOtpStatus('Code sent via ' + (d.channels || []).join(' + ') + '. Valid for 10 minutes.');
        startOtpCountdown(Number(d.cooldown) || 60);
        if (twofa) twofa.focus();
      } catch (_e) {
        setOtpStatus('Network error. Please try again.', true);
        sendOtp.disabled = false;
      }
    });
  }

  function clearEmailOtpTimers() {
    if (emailOtpTimerInterval) { clearInterval(emailOtpTimerInterval); emailOtpTimerInterval = null; }
    if (emailOtpResendInterval) { clearInterval(emailOtpResendInterval); emailOtpResendInterval = null; }
  }

  function startEmailOtpTimers(expiresInSec, resendAfterSec) {
    clearEmailOtpTimers();
    var expRemaining = Number(expiresInSec) || 300;
    function renderExpiry() {
      if (!emailOtpTimer) return;
      if (expRemaining <= 0) {
        emailOtpTimer.textContent = 'Code expired';
        emailOtpTimer.classList.add('is-bad');
        clearInterval(emailOtpTimerInterval);
        emailOtpTimerInterval = null;
        return;
      }
      emailOtpTimer.classList.remove('is-bad');
      var m = String(Math.floor(expRemaining / 60)).padStart(2, '0');
      var s = String(expRemaining % 60).padStart(2, '0');
      emailOtpTimer.textContent = 'Expires in ' + m + ':' + s;
    }
    renderExpiry();
    emailOtpTimerInterval = setInterval(function () {
      expRemaining -= 1;
      renderExpiry();
    }, 1000);

    if (emailOtpResendBtn) {
      var resendRem = Number(resendAfterSec) || 60;
      emailOtpResendBtn.disabled = resendRem > 0;
      emailOtpResendBtn.textContent = resendRem > 0 ? ('Resend (' + resendRem + 's)') : 'Resend Code';
      if (resendRem > 0) {
        emailOtpResendInterval = setInterval(function () {
          resendRem -= 1;
          if (resendRem <= 0) {
            clearInterval(emailOtpResendInterval);
            emailOtpResendInterval = null;
            emailOtpResendBtn.disabled = false;
            emailOtpResendBtn.textContent = 'Resend Code';
          } else {
            emailOtpResendBtn.textContent = 'Resend (' + resendRem + 's)';
          }
        }, 1000);
      }
    }
  }

  function enterEmailOtpStep(data) {
    pendingEmailOtp = { challenge_id: data.challenge_id, masked_email: data.masked_email || 'your email' };
    pendingTotpToken = null;
    if (passwordStep) passwordStep.hidden = true;
    if (twofaBlock) twofaBlock.hidden = true;
    if (emailOtpStep) emailOtpStep.hidden = false;
    if (emailOtpMasked) emailOtpMasked.textContent = pendingEmailOtp.masked_email;
    if (emailOtpInput) {
      emailOtpInput.value = '';
      emailOtpInput.required = true;
      emailOtpInput.focus();
    }
    go.disabled = false;
    go.textContent = 'Verify Email Code';
    startEmailOtpTimers(data.expires_in || 300, data.resend_after || 60);
  }

  function resetToPasswordStep() {
    clearEmailOtpTimers();
    pendingEmailOtp = null;
    pendingTotpToken = null;
    if (emailOtpStep) emailOtpStep.hidden = true;
    if (emailOtpInput) {
      emailOtpInput.value = '';
      emailOtpInput.required = false;
    }
    if (passwordStep) passwordStep.hidden = false;
    if (twofaBlock) twofaBlock.hidden = false;
    go.disabled = false;
    go.textContent = 'Sign in';
    show('');
  }

  if (emailOtpBackBtn) {
    emailOtpBackBtn.addEventListener('click', resetToPasswordStep);
  }

  if (emailOtpResendBtn) {
    emailOtpResendBtn.addEventListener('click', async function () {
      if (!pendingEmailOtp || !pendingEmailOtp.challenge_id || emailOtpResendBtn.disabled) return;
      show('');
      emailOtpResendBtn.disabled = true;
      emailOtpResendBtn.textContent = 'Sending…';
      try {
        var r = await fetch('/api/auth/admin-email-otp/resend', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ challenge_id: pendingEmailOtp.challenge_id })
        });
        var d = await r.json().catch(function () { return {}; });
        if (!r.ok) {
          show(d.error || 'Could not resend verification code.', 'error');
          if (r.status === 429 && d.retry_after) startEmailOtpTimers(300, Number(d.retry_after));
          else {
            emailOtpResendBtn.disabled = false;
            emailOtpResendBtn.textContent = 'Resend Code';
          }
          return;
        }
        pendingEmailOtp.challenge_id = d.challenge_id;
        show('A new 6-digit verification code was sent to ' + (d.masked_email || pendingEmailOtp.masked_email) + '.', 'info');
        startEmailOtpTimers(d.expires_in || 300, d.resend_after || 60);
        if (emailOtpInput) emailOtpInput.focus();
      } catch (_e) {
        show('Network error. Please try again.', 'error');
        emailOtpResendBtn.disabled = false;
        emailOtpResendBtn.textContent = 'Resend Code';
      }
    });
  }

  f.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (go.disabled) return;
    show('');
    if (f.email) f.email.removeAttribute('aria-invalid');
    if (f.password) f.password.removeAttribute('aria-invalid');
    if (twofa) twofa.removeAttribute('aria-invalid');
    if (emailOtpInput) emailOtpInput.removeAttribute('aria-invalid');
    var hp = document.getElementById('admin-website');
    if (hp && hp.value) return;

    if (pendingEmailOtp && pendingEmailOtp.challenge_id) {
      var otpVal = emailOtpInput ? emailOtpInput.value.trim() : '';
      if (!/^\d{6}$/.test(otpVal)) {
        if (emailOtpInput) emailOtpInput.setAttribute('aria-invalid', 'true');
        return show('Enter the 6-digit code sent to your email.', 'error');
      }
      go.disabled = true;
      go.textContent = 'Verifying…';
      try {
        var vr = await fetch('/api/auth/admin-email-otp/verify', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            challenge_id: pendingEmailOtp.challenge_id,
            otp: otpVal
          })
        });
        var vd = await vr.json().catch(function () { return {}; });
        if (!vr.ok || !vd.ok) {
          if (vd.locked) resetToPasswordStep();
          go.disabled = false;
          go.textContent = 'Verify Email Code';
          return show(vd.error || 'Verification failed.', 'error');
        }
        clearEmailOtpTimers();
        var vs = await fetch('/api/admin/session', { credentials: 'same-origin' });
        if (!vs.ok) {
          await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
          throw new Error('This account does not have staff access.');
        }
        try {
          localStorage.removeItem('cso_active_module_id');
          localStorage.removeItem('cso_open_sidebar_groups');
          localStorage.removeItem('cso_admin_redirect');
          localStorage.setItem('cso_admin_active', '1');
          sessionStorage.removeItem('cso_post_login_hash');
          sessionStorage.removeItem('returnTo');
          sessionStorage.removeItem('cso_admin_redirect');
        } catch (_e) {}
        location.replace(vd.redirect || ((next || '/admin/') + '#command-overview'));
        return;
      } catch (err) {
        go.disabled = false;
        go.textContent = 'Verify Email Code';
        return show(err.message || 'Verification failed.', 'error');
      }
    }

    var email = f.email.value.trim().toLowerCase(), password = f.password.value;
    if (!email || !password) {
      if (!email && f.email) f.email.setAttribute('aria-invalid', 'true');
      if (!password && f.password) f.password.setAttribute('aria-invalid', 'true');
      return show('Enter your email and password.', 'error');
    }
    go.disabled = true; go.textContent = 'Signing in…';
    try {
      var r = await fetch('/api/auth/login', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          password: password,
          twofa_code: twofa ? twofa.value.trim() : '',
          remember_me: !!(rememberMe && rememberMe.checked)
        })
      });
      var d = await r.json().catch(function () { return {}; });
      if (r.ok && d.requires_email_otp && d.challenge_id) {
        enterEmailOtpStep(d);
        return;
      }
      if (!r.ok) {
        if (d.requires_2fa) {
          if (twofaBlock) twofaBlock.classList.add('is-required');
          if (twofaChallengeNote) {
            twofaChallengeNote.textContent = d.totp_enabled
              ? '2FA is active for this staff account. Enter the 6-digit code from your Authenticator app or one of your 8-character backup recovery codes.'
              : 'Two-factor verification required. Enter your 6-digit code or backup recovery code.';
            twofaChallengeNote.hidden = false;
          }
          if (otpRow && d.can_send_otp === false) otpRow.hidden = true;
          if (twofa) {
            twofa.setAttribute('aria-invalid', 'true');
            twofa.required = true;
            twofa.focus();
          }
          go.disabled = false;
          go.textContent = 'Verify 2FA & Sign in';
          show(d.error || 'Enter your 2FA code to complete sign-in.', 'error');
          return;
        }
        throw new Error(d.error || 'Sign-in failed.');
      }
      var s = await fetch('/api/admin/session', { credentials: 'same-origin' });
      if (!s.ok) {
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
        throw new Error('This account does not have staff access.');
      }
      try {
        localStorage.removeItem('cso_active_module_id');
        localStorage.removeItem('cso_open_sidebar_groups');
        localStorage.removeItem('cso_admin_redirect');
        localStorage.setItem('cso_admin_active', '1');
        sessionStorage.removeItem('cso_post_login_hash');
        sessionStorage.removeItem('returnTo');
        sessionStorage.removeItem('cso_admin_redirect');
      } catch (_e) {}
      location.replace((next || '/admin/') + '#command-overview');
    } catch (err) {
      show(err.message || 'Sign-in failed.', 'error');
      go.disabled = false; go.textContent = 'Sign in';
    }
  });
})();
