/* Extracted from signup.html for strict CSP (v151). */
(function() {
      const form = document.getElementById('candidate-signup-form');
      const nameInput = document.getElementById('signup-fullname');
      const emailInput = document.getElementById('signup-email');
      const districtInput = document.getElementById('signup-district');
      const pwInput = document.getElementById('signup-password');
      const togglePwBtn = document.getElementById('btn-toggle-pw');
      const errorBox = document.getElementById('auth-error-msg');
      const submitBtn = document.getElementById('btn-submit-auth');

      // Restore cached form data from sessionStorage
      try {
        const cached = sessionStorage.getItem('cso_signup_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.fullName) nameInput.value = parsed.fullName;
          if (parsed.email) emailInput.value = parsed.email;
          if (parsed.district) districtInput.value = parsed.district;
        }
      } catch (e) {}

      // Cache non-sensitive inputs on change
      [nameInput, emailInput, districtInput].forEach(inp => {
        inp?.addEventListener('input', () => {
          try {
            sessionStorage.setItem('cso_signup_cache', JSON.stringify({
              fullName: nameInput.value.trim(),
              email: emailInput.value.trim().toLowerCase(),
              district: districtInput.value
            }));
          } catch(e) {}
        });
      });

      // Password toggle
      togglePwBtn.addEventListener('click', function() {
        const isPw = pwInput.type === 'password';
        pwInput.type = isPw ? 'text' : 'password';
        this.textContent = isPw ? 'Hide' : 'Show';
        this.setAttribute('aria-label', isPw ? 'Hide password' : 'Show password');
        this.setAttribute('aria-pressed', isPw ? 'true' : 'false');
      });

      function showError(msg, field) {
        if (errorBox) {
          errorBox.textContent = msg;
          errorBox.classList.add('is-visible');
        }
        if (field) field.setAttribute('aria-invalid', 'true');
      }

      function clearError() {
        if (errorBox) {
          errorBox.textContent = '';
          errorBox.classList.remove('is-visible');
        }
        [nameInput, emailInput, districtInput, pwInput].forEach(el => el?.removeAttribute('aria-invalid'));
      }

      try {
        const errCode = new URLSearchParams(window.location.search).get('error');
        const oauthErrors = {
          google_not_configured: 'Google sign-up is not configured on this environment yet. Please register with your email below.',
          google_auth_failed: 'Google sign-up could not be completed. Please try again or register with your email.',
          google_admin_blocked: 'Staff and admin accounts must sign in through the dedicated Admin portal.'
        };
        if (errCode && oauthErrors[errCode]) {
          showError(oauthErrors[errCode]);
        }
      } catch (e) {}

      form.addEventListener('submit', async function(e) {
        if (form.dataset.step === 'otp') return;
        e.preventDefault();
        clearError();

        const fullName = nameInput.value.trim();
        const email = emailInput.value.trim().toLowerCase();
        const district = districtInput.value;
        const password = pwInput.value;

        if (!fullName) {
          showError('Please enter your full name.', nameInput);
          nameInput.focus();
          return;
        }

        if (!email || !email.includes('@')) {
          showError('Please enter a valid candidate email address.', emailInput);
          emailInput.focus();
          return;
        }

        if (!password || password.length < 8 || password.length > 128) {
          showError('Password must be between 8 and 128 characters.', pwInput);
          pwInput.focus();
          return;
        }
        if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
          showError('Password must include an uppercase letter, a lowercase letter, a digit and a special character.', pwInput);
          pwInput.focus();
          return;
        }

        // Prevent double submission
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending verification code...';

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        try {
          const res = await fetch('/api/auth/register', {
            method: 'POST',
            credentials: 'same-origin',
            cache: 'no-store',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fullName,
              email,
              district,
              password,
              targetStreams: ['opsc', 'ossc'],
              website: document.getElementById('signup-website')?.value || ''
            }),
            signal: controller.signal
          });
          clearTimeout(timeoutId);

          const data = await res.json().catch(() => ({}));

          if (res.ok && data.success) {
            // Check if OTP verification is requested
            if (data.message && data.message.includes('Verification code sent')) {
              renderOtpStep(email);
              return;
            }

            submitBtn.textContent = 'Account created! Redirecting...';
            if (data.candidate) {
              const sessionPayload = {
                ...data.candidate,
                isAuthenticated: true
              };
              localStorage.setItem('cso_candidate_session_v1', JSON.stringify(sessionPayload));
              localStorage.setItem('cso_candidate_profile', JSON.stringify(sessionPayload));
            }
            if (data.token) {
              localStorage.setItem('cso_auth_token', data.token);
            }
            window.location.replace('/student-dashboard/');
          } else {
            localStorage.removeItem('cso_auth_token');
            localStorage.removeItem('cso_candidate_profile');
            localStorage.removeItem('cso_candidate_session_v1');
            showError(data.error || 'Failed to create candidate account. Please try again.');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Create Candidate Account';
          }
        } catch (err) {
          clearTimeout(timeoutId);
          localStorage.removeItem('cso_auth_token');
          localStorage.removeItem('cso_candidate_profile');
          localStorage.removeItem('cso_candidate_session_v1');
          showError(err.name === 'AbortError' ? 'Registration request timed out. Please try again.' : 'Unable to reach registration server. Please try again.');
          submitBtn.disabled = false;
          submitBtn.textContent = 'Create Candidate Account';
        }
      });

      function renderOtpStep(email) {
        form.dataset.step = 'otp';
        function mkNode(tag, cls, txt) {
          const n = document.createElement(tag);
          if (cls) n.className = cls;
          if (txt !== undefined && txt !== null) n.textContent = String(txt);
          return n;
        }

        const headerBox = mkNode('div', 'cso-u-14266126');
        headerBox.appendChild(mkNode('div', 'cso-u-4edad9f2', '📩'));
        headerBox.appendChild(mkNode('h3', 'cso-u-8d11cf64', 'Candidate Verification'));
        const infoP = mkNode('p', 'cso-u-95647bfc');
        infoP.appendChild(document.createTextNode('We sent a 6-digit OTP & instant magic link to'));
        infoP.appendChild(document.createElement('br'));
        infoP.appendChild(mkNode('strong', 'cso-u-9f5198ad', email));
        headerBox.appendChild(infoP);

        const otpWrap = mkNode('div', 'cso-u-f7683c10');
        const otpLabel = mkNode('label', 'cso-u-9cbba5c9', 'Enter 6-Digit Code');
        otpLabel.setAttribute('for', 'cso-otp-digit-0');
        otpWrap.appendChild(otpLabel);

        const boxesRow = mkNode('div', 'cso-u-6fbcc42c');
        boxesRow.id = 'cso-otp-boxes';
        const digits = [];
        for (let idx = 0; idx < 6; idx++) {
          const inp = mkNode('input', 'cso-otp-digit form-input cso-u-617a4dfb');
          inp.type = 'text';
          inp.id = 'cso-otp-digit-' + idx;
          inp.maxLength = 1;
          inp.pattern = '[0-9]';
          inp.inputMode = 'numeric';
          inp.setAttribute('aria-label', 'Verification code digit ' + (idx + 1));
          inp.setAttribute('aria-describedby', 'auth-error-msg');
          if (idx === 0) inp.autocomplete = 'one-time-code';
          inp.dataset.index = String(idx);
          inp.required = true;
          boxesRow.appendChild(inp);
          digits.push(inp);
        }
        otpWrap.appendChild(boxesRow);
        otpWrap.appendChild(mkNode('div', 'cso-u-9000f913', 'Paste your 6-digit code or check your inbox for the magic link.'));

        const submitOtpBtn = mkNode('button', 'btn-submit cso-u-3d8b57b3', 'Verify Code & Complete Registration');
        submitOtpBtn.type = 'submit';
        submitOtpBtn.id = 'btn-submit-otp';

        const footRow = mkNode('div', 'cso-u-13076d95');
        const resendBtn = mkNode('button', 'btn-toggle-pw cso-u-911aba9b');
        resendBtn.type = 'button';
        resendBtn.id = 'btn-resend-otp';
        resendBtn.disabled = true;
        const countdownSpan = mkNode('span', '', '60');
        countdownSpan.id = 'resend-countdown';
        resendBtn.append('Resend Code (', countdownSpan, 's)');
        footRow.appendChild(resendBtn);
        const startOver = mkNode('div', 'cso-u-b8316849');
        const startLink = mkNode('a', 'cso-u-2764475e', 'Start over with a different email');
        startLink.href = '/signup.html';
        startOver.appendChild(startLink);
        footRow.appendChild(startOver);

        form.replaceChildren(errorBox, headerBox, otpWrap, submitOtpBtn, footRow);

        digits[0]?.focus();

        let timeLeft = 60;
        let activeTicker = setInterval(() => {
          timeLeft--;
          if (countdownSpan) countdownSpan.textContent = String(timeLeft);
          if (timeLeft <= 0) {
            clearInterval(activeTicker);
            resendBtn.disabled = false;
            resendBtn.textContent = 'Resend Code';
          }
        }, 1000);

        resendBtn.addEventListener('click', async function() {
          resendBtn.disabled = true;
          resendBtn.textContent = 'Resending...';
          clearError();

          try {
            const rRes = await fetch('/api/auth/register', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, resend: true })
            });
            const rData = await rRes.json().catch(() => ({}));
            if (rRes.ok && rData.success) {
              timeLeft = 60;
              clearInterval(activeTicker);
              const newCountSpan = mkNode('span', '', '60');
              newCountSpan.id = 'resend-countdown';
              resendBtn.replaceChildren('Resend Code (', newCountSpan, 's)');
              activeTicker = setInterval(() => {
                timeLeft--;
                newCountSpan.textContent = String(timeLeft);
                if (timeLeft <= 0) {
                  clearInterval(activeTicker);
                  resendBtn.disabled = false;
                  resendBtn.textContent = 'Resend Code';
                }
              }, 1000);
            } else {
              showError(rData.error || 'Please wait before requesting a new code.');
              resendBtn.disabled = false;
              resendBtn.textContent = 'Resend Code';
            }
          } catch(e) {
            showError('Unable to resend code. Please try again.');
            resendBtn.disabled = false;
            resendBtn.textContent = 'Resend Code';
          }
        });

        function getEnteredOtp() {
          return digits.map(d => d.value.trim()).join('');
        }

        // Auto progression and backspace navigation
        digits.forEach((digit, index) => {
          digit.addEventListener('input', function(e) {
            const val = this.value.replace(/\D/g, '');
            this.value = val ? val.charAt(0) : '';
            if (this.value && index < 5) {
              digits[index + 1].focus();
            }
            if (getEnteredOtp().length === 6) {
              triggerOtpSubmit();
            }
          });

          digit.addEventListener('keydown', function(e) {
            if (e.key === 'Backspace' && !this.value && index > 0) {
              digits[index - 1].focus();
              digits[index - 1].value = '';
            }
          });

          // Clipboard paste handler
          digit.addEventListener('paste', function(e) {
            e.preventDefault();
            const text = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '').slice(0, 6);
            if (text.length > 0) {
              for (let i = 0; i < text.length && i < 6; i++) {
                digits[i].value = text[i];
              }
              const targetIndex = Math.min(text.length, 5);
              digits[targetIndex].focus();
              if (text.length === 6) {
                triggerOtpSubmit();
              }
            }
          });
        });

        async function triggerOtpSubmit() {
          clearError();
          const code = getEnteredOtp();
          if (code.length !== 6) {
            showError('Please enter all 6 digits of the verification code.');
            return;
          }

          submitOtpBtn.disabled = true;
          submitOtpBtn.textContent = 'Verifying code...';

          const otpController = new AbortController();
          const otpTimeoutId = setTimeout(() => otpController.abort(), 10000);

          try {
            const vRes = await fetch('/api/auth/verify-otp', {
              method: 'POST',
              credentials: 'same-origin',
              cache: 'no-store',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, code }),
              signal: otpController.signal
            });
            clearTimeout(otpTimeoutId);

            const vData = await vRes.json().catch(() => ({}));

            if (vRes.ok && vData.success) {
              submitOtpBtn.textContent = 'Verification successful! Redirecting...';
              try { sessionStorage.removeItem('cso_signup_cache'); } catch(e) {}

              // Sync the verified user into the client-side session cache
              const verifiedUser = vData.user || vData.candidate;
              if (verifiedUser) {
                const sessionPayload = {
                  id: verifiedUser.id,
                  fullName: verifiedUser.name || verifiedUser.fullName,
                  name: verifiedUser.name || verifiedUser.fullName,
                  email: verifiedUser.email,
                  phone: verifiedUser.phone || '',
                  district: verifiedUser.district || '',
                  role: verifiedUser.role || 'candidate',
                  isAuthenticated: true
                };
                localStorage.setItem('cso_candidate_session_v1', JSON.stringify(sessionPayload));
                localStorage.setItem('cso_candidate_profile', JSON.stringify(sessionPayload));
              }
              if (vData.sessionToken || vData.token) {
                localStorage.setItem('cso_auth_token', vData.sessionToken || vData.token);
              }

              // Redirect immediately in a single canonical hop to the verified dashboard
              const urlParams = new URLSearchParams(window.location.search);
              const rawRedirect = urlParams.get('redirect') || urlParams.get('next') || vData.redirect || '/student-dashboard/?verified=1';
              let targetUrl = '/student-dashboard/?verified=1';
              if (typeof rawRedirect === 'string' && rawRedirect.startsWith('/') && !rawRedirect.startsWith('//')) {
                try {
                  const parsed = new URL(rawRedirect, window.location.origin);
                  const p = parsed.pathname.toLowerCase();
                  if (/^\/(?:student-dashboard|candidate-hub|candidate|dashboard|portal)\/?$/.test(p)) {
                    targetUrl = '/student-dashboard/' + parsed.search + parsed.hash;
                  } else if (!/^\/(?:login|signup|reset-password)/.test(p)) {
                    targetUrl = parsed.pathname + parsed.search + parsed.hash;
                  }
                } catch (e) {}
              }

              window.location.replace(targetUrl);
            } else {
              showError(vData.error || 'Invalid or expired verification code.');
              submitOtpBtn.disabled = false;
              submitOtpBtn.textContent = 'Verify Code & Complete Registration';
            }
          } catch (verErr) {
            clearTimeout(otpTimeoutId);
            showError(verErr.name === 'AbortError' ? 'Verification request timed out. Please try again.' : 'Unable to connect to verification server. Please try again.');
            submitOtpBtn.disabled = false;
            submitOtpBtn.textContent = 'Verify Code & Complete Registration';
          }
        }

        form.addEventListener('submit', function(ev) {
          ev.preventDefault();
          triggerOtpSubmit();
        });
      }

      // Auth modal handoff: arriving at signup.html?email=... means a dual-channel
      // code was just dispatched — render the OTP verification step directly.
      try {
        const handoffEmail = (new URLSearchParams(window.location.search).get('email') || '').trim().toLowerCase();
        if (handoffEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(handoffEmail)) {
          renderOtpStep(handoffEmail);
        }
      } catch (e) {}
    })();
