/* Extracted from login.html for strict CSP (v151). */
(function() {
      // ---------------- Screen router ----------------
      const SCREENS = ['signin', 'recovery-email', 'recovery-otp', 'recovery-newpw'];
      const TITLES = {
        'signin': ['Candidate Sign In', 'Access your verified syllabus checklists and study desk'],
        'recovery-email': ['Recover Your Password', 'We will email you a 6-digit code and a one-click reset link'],
        'recovery-otp': ['Enter Verification Code', 'Check your inbox for the 6-digit recovery code'],
        'recovery-newpw': ['Set New Password', 'Choose a strong new password for your account']
      };
      let recoveryEmail = '';
      let resetGrant = null;
      let resendCooldownTimer = null;

      function showScreen(name) {
        SCREENS.forEach(s => {
          const el = document.getElementById('screen-' + s);
          if (el) el.classList.toggle('active', s === name);
        });
        const meta = TITLES[name] || TITLES['signin'];
        document.getElementById('auth-screen-title').textContent = meta[0];
        document.getElementById('auth-screen-subtitle').textContent = meta[1];
        const footer = document.getElementById('auth-footer');
        if (footer) footer.classList.toggle('is-hidden', name !== 'signin');
        const firstInput = document.querySelector('#screen-' + name + ' input');
        if (firstInput) setTimeout(() => firstInput.focus(), 30);
      }

      function showError(id, msg, field) {
        const box = document.getElementById(id);
        if (box) {
          box.textContent = msg;
          box.classList.add('is-visible');
        }
        if (field) field.setAttribute('aria-invalid', 'true');
      }
      function clearError(id, fields) {
        const box = document.getElementById(id);
        if (box) {
          box.textContent = '';
          box.classList.remove('is-visible');
        }
        (fields || []).forEach(f => f?.removeAttribute('aria-invalid'));
      }
      function busy(btn, text) {
        btn.disabled = true;
        btn.dataset.label = btn.textContent;
        btn.textContent = text;
      }
      function unbusy(btn) {
        btn.disabled = false;
        if (btn.dataset.label) btn.textContent = btn.dataset.label;
      }

      try {
        const errCode = new URLSearchParams(window.location.search).get('error');
        const oauthErrors = {
          google_not_configured: 'Google sign-in is not configured on this environment yet. Please sign in with your User ID / email and password.',
          google_auth_failed: 'Google sign-in could not be completed. Please try again or use your User ID / email and password.',
          google_admin_blocked: 'Staff and admin accounts must sign in through the dedicated Admin portal.',
          account_restricted: 'Your candidate account is currently restricted. Please contact support.'
        };
        if (errCode && oauthErrors[errCode]) {
          showError('auth-error-msg', oauthErrors[errCode]);
        }
        const googleBtn = document.getElementById('btn-google-login');
        const nextParam = new URLSearchParams(window.location.search).get('next') || new URLSearchParams(window.location.search).get('redirect');
        if (googleBtn && nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//')) {
          googleBtn.href = '/api/auth/google?mode=login&next=' + encodeURIComponent(nextParam);
        }
      } catch (e) {}

      // Flash banner after a successful reset (set by the reset flow itself
      // or by /reset-password.html before redirecting here).
      try {
        if (sessionStorage.getItem('cso_password_reset_flash') === '1') {
          sessionStorage.removeItem('cso_password_reset_flash');
          const banner = document.getElementById('flash-banner');
          if (banner) {
            banner.classList.add('is-visible');
            setTimeout(() => { banner.classList.remove('is-visible'); }, 7000);
          }
        }
      } catch (e) {}

      function normalizeCanonicalRedirect(raw) {
        const fallback = '/student-dashboard/';
        if (!raw || typeof raw !== 'string') return fallback;
        const trimmed = raw.trim();
        if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return fallback;
        try {
          const parsed = new URL(trimmed, window.location.origin);
          if (parsed.origin !== window.location.origin) return fallback;
          const p = parsed.pathname.toLowerCase();
          if (/^\/(?:login(?:\.html)?|signup(?:\.html)?|reset-password(?:\.html)?)(?:\/|$)/.test(p)) {
            return fallback;
          }
          if (/^\/(?:student-dashboard|candidate-hub|candidate|dashboard|portal)\/?$/.test(p)) {
            return '/student-dashboard/' + parsed.search + parsed.hash;
          }
          return parsed.pathname + parsed.search + parsed.hash;
        } catch (e) {
          return fallback;
        }
      }

      async function purgeAuthDashboardCaches() {
        if (typeof caches === 'undefined') return;
        const targets = ['/student-dashboard/', '/student-dashboard/index.html', '/candidate-hub/', '/login.html', '/api/auth/me'];
        try {
          const work = (async () => {
            const keys = await caches.keys();
            await Promise.all(keys.map(async key => {
              const cache = await caches.open(key);
              await Promise.all(targets.map(path => cache.delete(path, { ignoreSearch: true }).catch(() => false)));
            }));
          })();
          await Promise.race([work, new Promise(r => setTimeout(r, 80))]);
        } catch (e) {}
      }

      // ---------------- Sign-in screen ----------------
      const form = document.getElementById('candidate-login-form');
      const emailInput = document.getElementById('login-email');
      const pwInput = document.getElementById('login-password');
      const togglePwBtn = document.getElementById('btn-toggle-pw');
      const errorBox = document.getElementById('auth-error-msg');
      const submitBtn = document.getElementById('btn-submit-auth');

      function wirePwToggle(btn, input) {
        btn.addEventListener('click', function() {
          const isPw = input.type === 'password';
          input.type = isPw ? 'text' : 'password';
          btn.textContent = isPw ? 'Hide' : 'Show';
          btn.setAttribute('aria-label', isPw ? 'Hide password' : 'Show password');
          btn.setAttribute('aria-pressed', isPw ? 'true' : 'false');
        });
      }
      wirePwToggle(togglePwBtn, pwInput);

      form.addEventListener('submit', async function(e) {
        e.preventDefault();
        clearError('auth-error-msg', [emailInput, pwInput]);
        const hp = document.getElementById('login-website');
        if (hp && hp.value) return;

        const identifier = emailInput.value.trim().toLowerCase();
        const password = pwInput.value;

        if (!identifier || identifier.length < 2) {
          showError('auth-error-msg', 'Please enter your candidate Email Address or User ID.', emailInput);
          emailInput.focus();
          return;
        }
        if (!password) {
          showError('auth-error-msg', 'Please enter your password.', pwInput);
          pwInput.focus();
          return;
        }

        busy(submitBtn, 'Verifying...');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            credentials: 'same-origin',
            cache: 'no-store',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier, email: identifier, password }),
            signal: controller.signal
          });
          clearTimeout(timeoutId);

          const data = await res.json().catch(() => ({}));

          if (res.ok && data.success) {
            submitBtn.textContent = 'Access granted! Redirecting...';
            if (data.candidate) {
              const sessionPayload = { ...data.candidate, isAuthenticated: true };
              localStorage.setItem('cso_candidate_session_v1', JSON.stringify(sessionPayload));
              localStorage.setItem('cso_candidate_profile', JSON.stringify(sessionPayload));
            }
            if (data.token) {
              localStorage.setItem('cso_auth_token', data.token);
            }

            // Single-hop canonical redirect: normalize any alias (/candidate-hub/, /dashboard/)
            // directly to /student-dashboard/ and evict any stale SW cache entries first.
            const urlParams = new URLSearchParams(window.location.search);
            const redirectParam = urlParams.get('redirect') || urlParams.get('next');
            const targetUrl = normalizeCanonicalRedirect(redirectParam);

            await purgeAuthDashboardCaches();
            window.location.replace(targetUrl);
            return;
          }

          localStorage.removeItem('cso_auth_token');
          localStorage.removeItem('cso_candidate_profile');
          localStorage.removeItem('cso_candidate_session_v1');
          showError('auth-error-msg', data.error || 'Invalid email or password');
          unbusy(submitBtn);
        } catch (err) {
          clearTimeout(timeoutId);
          localStorage.removeItem('cso_auth_token');
          localStorage.removeItem('cso_candidate_profile');
          localStorage.removeItem('cso_candidate_session_v1');
          showError('auth-error-msg', err.name === 'AbortError'
            ? 'Login request timed out. Please try again.'
            : 'Unable to reach authentication server. Please try again.');
          unbusy(submitBtn);
        }
      });

      // ---------------- Recovery navigation ----------------
      document.getElementById('forgot-password-link').addEventListener('click', () => {
        clearError('recovery-email-error');
        const prefill = emailInput.value.trim();
        if (prefill) document.getElementById('recovery-email').value = prefill;
        showScreen('recovery-email');
      });

      document.querySelectorAll('[data-back-to]').forEach(btn => {
        btn.addEventListener('click', () => {
          clearError('recovery-otp-error');
          clearError('recovery-email-error');
          showScreen(btn.dataset.backTo);
        });
      });

      // ---------------- Recovery: request dual-channel email ----------------
      const emailForm = document.getElementById('recovery-email-form');
      const sendBtn = document.getElementById('btn-send-recovery');

      emailForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const recInput = document.getElementById('recovery-email');
        clearError('recovery-email-error', [recInput]);

        const email = recInput.value.trim().toLowerCase();
        if (!email || !email.includes('@')) {
          showError('recovery-email-error', 'Please enter a valid email address.', recInput);
          recInput.focus();
          return;
        }

        busy(sendBtn, 'Sending...');

        try {
          const res = await fetch('/api/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
          });
          const data = await res.json().catch(() => ({}));

          // Anti-enumeration: unknown emails get the same generic success —
          // the OTP screen is shown either way.
          if (res.status === 429) {
            showError('recovery-email-error', data.error || 'Too many recovery requests. Please try again later.');
            unbusy(sendBtn);
            return;
          }
          if (!res.ok || !data.success) {
            showError('recovery-email-error', data.error || 'Unable to send the recovery email. Please try again.');
            unbusy(sendBtn);
            return;
          }

          recoveryEmail = email;
          document.getElementById('recovery-otp').value = '';
          clearError('recovery-otp-error');
          showScreen('recovery-otp');
          startResendCooldown();
        } catch (err) {
          showError('recovery-email-error', 'Unable to reach the server. Please try again.');
        } finally {
          unbusy(sendBtn);
        }
      });

      function startResendCooldown() {
        const btn = document.getElementById('resend-recovery-btn');
        const timer = document.getElementById('resend-timer');
        let remaining = 60;
        btn.disabled = true;
        clearInterval(resendCooldownTimer);
        resendCooldownTimer = setInterval(() => {
          remaining--;
          if (remaining <= 0) {
            clearInterval(resendCooldownTimer);
            btn.disabled = false;
            timer.textContent = '';
          } else {
            timer.textContent = ' (available in ' + remaining + 's)';
          }
        }, 1000);
      }

      document.getElementById('resend-recovery-btn').addEventListener('click', async function() {
        if (this.disabled || !recoveryEmail) return;
        this.disabled = true;
        try {
          await fetch('/api/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: recoveryEmail })
          });
        } catch (e) { /* silent — the server enforces its own cooldown */ }
        startResendCooldown();
      });

      // ---------------- Recovery: verify OTP in-page ----------------
      const otpForm = document.getElementById('recovery-otp-form');
      const verifyBtn = document.getElementById('btn-verify-otp');

      otpForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const otpInput = document.getElementById('recovery-otp');
        clearError('recovery-otp-error', [otpInput]);

        const otp = otpInput.value.trim();
        if (!/^\d{6}$/.test(otp)) {
          showError('recovery-otp-error', 'Please enter the 6-digit code from your email.', otpInput);
          otpInput.focus();
          return;
        }

        busy(verifyBtn, 'Verifying...');

        try {
          const res = await fetch('/api/auth/verify-reset-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: recoveryEmail, otp })
          });
          const data = await res.json().catch(() => ({}));

          if (!res.ok || !data.success) {
            const left = typeof data.attemptsLeft === 'number'
              ? ' (' + data.attemptsLeft + ' attempt' + (data.attemptsLeft === 1 ? '' : 's') + ' remaining)'
              : '';
            showError('recovery-otp-error', (data.error || 'Invalid or expired verification code.') + left);
            document.getElementById('recovery-otp').value = '';
            document.getElementById('recovery-otp').focus();
            unbusy(verifyBtn);
            return;
          }

          // Valid OTP — unlock the new-password fields immediately, no redirect.
          resetGrant = data.resetToken;
          document.getElementById('new-password').value = '';
          document.getElementById('confirm-password').value = '';
          clearError('recovery-newpw-error');
          showScreen('recovery-newpw');
        } catch (err) {
          showError('recovery-otp-error', 'Unable to reach the server. Please try again.');
          unbusy(verifyBtn);
        }
      });

      // ---------------- Recovery: set new password ----------------
      const newpwForm = document.getElementById('recovery-newpw-form');
      const resetBtn = document.getElementById('btn-reset-password');
      wirePwToggle(document.getElementById('btn-toggle-newpw'), document.getElementById('new-password'));

      newpwForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const newPwInput = document.getElementById('new-password');
        const confirmInput = document.getElementById('confirm-password');
        clearError('recovery-newpw-error', [newPwInput, confirmInput]);

        const pw = newPwInput.value;
        const confirm = confirmInput.value;

        if (pw.length < 8) {
          showError('recovery-newpw-error', 'Password must be at least 8 characters long.', newPwInput);
          newPwInput.focus();
          return;
        }
        if (pw !== confirm) {
          showError('recovery-newpw-error', 'Passwords do not match.', confirmInput);
          confirmInput.focus();
          return;
        }
        if (!resetGrant) {
          showError('recovery-newpw-error', 'Your verification session expired. Please start the recovery again.');
          return;
        }

        busy(resetBtn, 'Updating password...');

        try {
          const res = await fetch('/api/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: recoveryEmail, grant: resetGrant, password: pw })
          });
          const data = await res.json().catch(() => ({}));

          if (!res.ok || !data.success) {
            showError('recovery-newpw-error', data.error || 'Unable to reset the password. Please try again.');
            unbusy(resetBtn);
            return;
          }

          // Flash alert on /login after redirect; stale sessions were
          // revoked server-side, so clear any local remnants.
          try {
            sessionStorage.setItem('cso_password_reset_flash', '1');
            localStorage.removeItem('cso_auth_token');
            localStorage.removeItem('cso_candidate_session_v1');
            localStorage.removeItem('cso_candidate_profile');
          } catch (err) {}
          window.location.replace('/login.html');
        } catch (err) {
          showError('recovery-newpw-error', 'Unable to reach the server. Please try again.');
          unbusy(resetBtn);
        }
      });
    })();
