/* Extracted from reset-password.html for strict CSP (v151). */
(function() {
      const token = new URLSearchParams(window.location.search).get('token') || '';

      function show(id) {
        document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
        document.getElementById(id).classList.add('active');
      }

      function wirePwToggle(btn, input) {
        btn.addEventListener('click', function() {
          const isPw = input.type === 'password';
          input.type = isPw ? 'text' : 'password';
          btn.textContent = isPw ? 'Hide' : 'Show';
          btn.setAttribute('aria-label', isPw ? 'Hide password' : 'Show password');
          btn.setAttribute('aria-pressed', isPw ? 'true' : 'false');
        });
      }
      wirePwToggle(document.getElementById('btn-toggle-newpw'), document.getElementById('new-password'));

      function showError(msg) {
        const box = document.getElementById('reset-error');
        box.textContent = msg;
        box.style.display = 'block';
      }

      // Validate the magic-link token before revealing the password fields.
      (async function validate() {
        if (!token) {
          document.getElementById('page-subtitle').textContent = 'Reset link missing';
          show('screen-invalid');
          return;
        }
        try {
          const res = await fetch('/api/auth/verify-reset-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token })
          });
          const data = await res.json().catch(() => ({}));

          if (res.ok && data.valid) {
            document.getElementById('page-subtitle').textContent = 'Choose a strong new password for your account';
            show('screen-setpw');
            setTimeout(() => document.getElementById('new-password').focus(), 30);
          } else {
            document.getElementById('page-subtitle').textContent = 'Reset link invalid or expired';
            show('screen-invalid');
          }
        } catch (err) {
          document.getElementById('page-subtitle').textContent = 'Could not validate the link';
          document.getElementById('validating-status').textContent = 'Unable to reach the server. Please check your connection and reload.';
          document.getElementById('validating-status').style.display = 'block';
        }
      })();

      document.getElementById('reset-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        const box = document.getElementById('reset-error');
        box.style.display = 'none';

        const pw = document.getElementById('new-password').value;
        const confirm = document.getElementById('confirm-password').value;

        if (pw.length < 8) {
          showError('Password must be at least 8 characters long.');
          return;
        }
        if (pw !== confirm) {
          showError('Passwords do not match.');
          return;
        }

        const btn = document.getElementById('btn-submit-reset');
        btn.disabled = true;
        btn.textContent = 'Updating password...';

        try {
          const res = await fetch('/api/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, password: pw })
          });
          const data = await res.json().catch(() => ({}));

          if (!res.ok || !data.success) {
            showError(data.error || 'Unable to reset the password. Please try again.');
            btn.disabled = false;
            btn.textContent = 'Set New Password';
            return;
          }

          // Flash alert on /login; all server sessions were revoked.
          try {
            sessionStorage.setItem('cso_password_reset_flash', '1');
            localStorage.removeItem('cso_auth_token');
            localStorage.removeItem('cso_candidate_session_v1');
            localStorage.removeItem('cso_candidate_profile');
          } catch (err) {}
          window.location.href = '/login.html';
        } catch (err) {
          showError('Unable to reach the server. Please try again.');
          btn.disabled = false;
          btn.textContent = 'Set New Password';
        }
      });
    })();
