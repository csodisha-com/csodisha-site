/**
 * Common Sense Odisha (CSO) — Candidate Authentication Modal & Session Manager
 * Connects header [Login] and [Sign Up] buttons across the site to an interactive modal.
 * Persists candidate session into localStorage['cso_candidate_session_v1']
 * Stores candidate accounts vault in localStorage['cso_registered_accounts_v1']
 * Swaps header buttons with '👤 My Dashboard' and '[Logout]'
 */
(function(window) {
  'use strict';

  const SESSION_KEY = 'cso_candidate_session_v1';
  const VAULT_KEY = 'cso_registered_accounts_v1';

  const ODISHA_DISTRICTS = [
    "Angul", "Balangir", "Balasore", "Bargarh", "Bhadrak", "Boudh",
    "Cuttack", "Deogarh", "Dhenkanal", "Gajapati", "Ganjam", "Jagatsinghpur",
    "Jajpur", "Jharsuguda", "Kalahandi", "Kandhamal", "Kendrapara", "Kendujhar",
    "Khordha (Bhubaneswar)", "Koraput", "Malkangiri", "Mayurbhanj", "Nabarangpur",
    "Nayagarh", "Nuapada", "Puri", "Rayagada", "Sambalpur", "Subarnapur", "Sundargarh"
  ];

  const TARGET_EXAMS = [
    { id: "opsc", label: "OPSC (OCS / OAS / OFS)" },
    { id: "ossc", label: "OSSC (CGL / CHSL / CTSRE)" },
    { id: "osssc", label: "OSSSC (RI / ARI / Amin / Forest Guard)" },
    { id: "teaching", label: "Teacher Education (Odisha B.Ed / OTET / OSSTET)" },
    { id: "police", label: "Odisha Police (SI / Constable)" },
    { id: "schemes", label: "Welfare Schemes & Scholarships (Subhadra / KALIA)" }
  ];

  // Client-side salted hash utility
  function hashPassword(password) {
    if (!password) return '';
    let hash = 0x811c9dc5;
    const str = 'cso_salt_2026_' + password;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
  }

  // Generate unique account ID
  function generateAccountId() {
    return 'cso_usr_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
  }

  // Vault Management
  function getRegisteredAccounts() {
    try {
      const raw = localStorage.getItem(VAULT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse candidate vault', e);
    }
    return [];
  }

  function saveRegisteredAccounts(accounts) {
    try {
      localStorage.setItem(VAULT_KEY, JSON.stringify(accounts));
    } catch (e) {
      console.error('Failed to save accounts to vault', e);
    }
  }

  function seedVaultFromSession() {
    let accounts = getRegisteredAccounts();
    if (accounts.length === 0) {
      const currentSession = getCandidateSession();
      if (currentSession && (currentSession.email || currentSession.mobile)) {
        const seededAccount = {
          id: generateAccountId(),
          fullName: currentSession.fullName || currentSession.name || 'Candidate Aspirant',
          email: currentSession.email || '',
          mobile: currentSession.mobile || currentSession.phone || '',
          passwordHash: hashPassword('Candidate@123'),
          dob: currentSession.dob || '15-08-2000',
          state: currentSession.state || 'Odisha',
          district: currentSession.district || 'Balasore (Baleswar)',
          targetExams: Array.isArray(currentSession.targetExams) ? currentSession.targetExams : ['OPSC OCS', 'OSSC CGL'],
          registeredAt: currentSession.registeredAt || new Date().toISOString(),
          lastLoginAt: currentSession.lastLoginAt || new Date().toISOString(),
          failedLoginAttempts: 0,
          lockoutUntil: null
        };
        accounts.push(seededAccount);
        saveRegisteredAccounts(accounts);
      }
    }
  }

  function getCandidateSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn('Failed to parse candidate session', e);
    }
    return null;
  }

  function setCandidateSession(data) {
    try {
      const fullName = data.fullName || data.name || 'Aspirant';
      const email = data.email || '';
      const mobile = data.mobile || data.phone || '';
      const state = data.state || 'Odisha';
      const district = data.district || 'Balasore (Baleswar)';
      const targetExams = Array.isArray(data.targetExams) ? data.targetExams : ['OPSC OCS', 'OSSC CGL', 'Odisha B.Ed'];
      const dob = data.dob || '';

      const session = {
        fullName: fullName,
        name: fullName,
        email: email,
        mobile: mobile,
        phone: mobile,
        state: state,
        district: district,
        dob: dob,
        isAuthenticated: true,
        sessionType: data.sessionType || 'local_verified',
        registeredAt: data.registeredAt || new Date().toISOString(),
        lastLoginAt: data.lastLoginAt || new Date().toISOString(),
        authenticatedAt: new Date().toISOString(),
        targetExams: targetExams,
        isGuest: !!data.isGuest
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      updateHeaderAuthElements();
      return session;
    } catch (e) {
      console.error('Failed to save candidate session', e);
      return null;
    }
  }

  function clearCandidateSession() {
    localStorage.removeItem(SESSION_KEY);
    updateHeaderAuthElements();
  }

  function updateHeaderAuthElements() {
    const session = getCandidateSession();
    const containers = document.querySelectorAll('.cso-desktop-auth-buttons, #cso-auth, .auth');

    containers.forEach(container => {
      if (session) {
        const displayName = session.fullName || session.name || 'Aspirant';
        container.innerHTML = `
          <div class="cso-logged-in-bar" style="display:flex;align-items:center;gap:8px;">
            <a href="/student-dashboard/" class="btn-dashboard" style="display:inline-flex;align-items:center;gap:5px;background:#0d9488;color:#ffffff;font-size:12px;font-weight:600;padding:6px 14px;border-radius:8px;text-decoration:none;transition:background 0.2s;">
              <span aria-hidden="true">👤</span>
              <span>My Dashboard</span>
            </a>
            <button type="button" class="btn-candidate-logout" style="background:transparent;border:1px solid #475569;color:#94a3b8;font-size:11px;font-weight:600;padding:5px 10px;border-radius:6px;cursor:pointer;transition:all 0.2s;">
              Logout
            </button>
          </div>
        `;
        const logoutBtn = container.querySelector('.btn-candidate-logout');
        if (logoutBtn) {
          logoutBtn.onclick = function(e) {
            e.preventDefault();
            clearCandidateSession();
            window.location.reload();
          };
        }
      }
    });

    // Mobile auth wrapper dropdown
    const mobileMenu = document.getElementById('cso-auth-menu');
    if (mobileMenu) {
      if (session) {
        const displayName = (session.fullName || session.name || 'Aspirant').split(' ')[0];
        mobileMenu.innerHTML = `
          <a href="/student-dashboard/" class="cso-auth-item" style="color:#0d9488;font-weight:bold;">👤 My Dashboard (${displayName})</a>
          <a href="#" class="cso-auth-item cso-mobile-logout" style="color:#f43f5e;">Logout</a>
        `;
        const mobLogout = mobileMenu.querySelector('.cso-mobile-logout');
        if (mobLogout) {
          mobLogout.onclick = function(e) {
            e.preventDefault();
            clearCandidateSession();
            window.location.reload();
          };
        }
      }
    }
  }

  function renderAuthModal(initialTab) {
    let modal = document.getElementById('cso-auth-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'cso-auth-modal';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-labelledby', 'cso-auth-title');
      modal.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(2,6,23,0.85);backdrop-filter:blur(6px);padding:16px;opacity:0;transition:opacity 0.25s ease;';
      document.body.appendChild(modal);
    }

    const isSignUp = initialTab === 'signup';

    modal.innerHTML = `
      <div class="cso-auth-modal-card" style="width:100%;max-width:480px;background:#0f172a;border:1px solid #334155;border-radius:16px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);overflow:hidden;animation:csoPopIn 0.25s ease;">
        <!-- Modal Header -->
        <div style="padding:18px 24px 14px;border-bottom:1px solid #1e293b;display:flex;align-items:center;justify-content:space-between;">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:10px;background:rgba(13,148,136,0.15);color:#2dd4bf;font-size:16px;">🎓</span>
            <div>
              <h3 id="cso-auth-title" style="margin:0;font-size:16px;font-weight:700;color:#f8fafc;letter-spacing:-0.01em;">Candidate Portal</h3>
              <p style="margin:0;font-size:11px;color:#94a3b8;">Common Sense Odisha — Verified Aspirant Access</p>
            </div>
          </div>
          <button type="button" id="cso-auth-close-btn" aria-label="Close dialog" style="background:transparent;border:none;color:#94a3b8;font-size:20px;cursor:pointer;padding:4px 8px;border-radius:6px;line-height:1;">✕</button>
        </div>

        <!-- Mode Tabs -->
        <div style="display:flex;border-bottom:1px solid #1e293b;background:#090d16;">
          <button type="button" id="tab-login" style="flex:1;padding:12px;text-align:center;font-size:13px;font-weight:600;background:${!isSignUp ? '#0f172a' : 'transparent'};color:${!isSignUp ? '#2dd4bf' : '#94a3b8'};border:none;border-bottom:${!isSignUp ? '2px solid #0d9488' : 'none'};cursor:pointer;">Sign In</button>
          <button type="button" id="tab-signup" style="flex:1;padding:12px;text-align:center;font-size:13px;font-weight:600;background:${isSignUp ? '#0f172a' : 'transparent'};color:${isSignUp ? '#2dd4bf' : '#94a3b8'};border:none;border-bottom:${isSignUp ? '2px solid #0d9488' : 'none'};cursor:pointer;">Create Account</button>
        </div>

        <!-- Form Body -->
        <form id="cso-auth-form" style="padding:20px 24px;display:flex;flex-direction:column;gap:14px;max-height:calc(85vh - 120px);overflow-y:auto;">
          
          <div id="cso-signup-fields" style="display:${isSignUp ? 'flex' : 'none'};flex-direction:column;gap:12px;">
            <div>
              <label style="display:block;font-size:11px;font-weight:600;color:#cbd5e1;margin-bottom:4px;">Full Name *</label>
              <input type="text" id="auth-name" placeholder="e.g. Subham Mohanty" style="width:100%;box-sizing:border-box;background:#020617;border:1px solid #334155;border-radius:8px;padding:9px 12px;color:#ffffff;font-size:13px;outline:none;" />
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
              <div>
                <label style="display:block;font-size:11px;font-weight:600;color:#cbd5e1;margin-bottom:4px;">Mobile Number (+91) *</label>
                <input type="tel" id="auth-mobile" placeholder="9876543210" maxlength="10" style="width:100%;box-sizing:border-box;background:#020617;border:1px solid #334155;border-radius:8px;padding:9px 12px;color:#ffffff;font-size:13px;outline:none;" />
              </div>
              <div>
                <label style="display:block;font-size:11px;font-weight:600;color:#cbd5e1;margin-bottom:4px;">Date of Birth *</label>
                <input type="date" id="auth-dob" value="2000-08-15" style="width:100%;box-sizing:border-box;background:#020617;border:1px solid #334155;border-radius:8px;padding:9px 12px;color:#ffffff;font-size:13px;outline:none;" />
              </div>
            </div>

            <div>
              <label style="display:block;font-size:11px;font-weight:600;color:#cbd5e1;margin-bottom:4px;">Home District (Odisha) *</label>
              <select id="auth-district" style="width:100%;box-sizing:border-box;background:#020617;border:1px solid #334155;border-radius:8px;padding:9px 12px;color:#ffffff;font-size:13px;outline:none;">
                ${ODISHA_DISTRICTS.map(d => `<option value="${d}" ${d.includes('Balasore') ? 'selected' : ''}>${d}</option>`).join('')}
              </select>
            </div>

            <div>
              <label style="display:block;font-size:11px;font-weight:600;color:#cbd5e1;margin-bottom:6px;">Target Exams & Interests (Select all that apply)</label>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
                ${TARGET_EXAMS.map(ex => `
                  <label style="display:flex;align-items:center;gap:6px;font-size:11px;color:#94a3b8;background:#020617;border:1px solid #1e293b;padding:6px 8px;border-radius:6px;cursor:pointer;">
                    <input type="checkbox" name="auth-exam" value="${ex.id}" ${ex.id === 'opsc' || ex.id === 'ossc' ? 'checked' : ''} style="accent-color:#0d9488;" />
                    <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${ex.label}</span>
                  </label>
                `).join('')}
              </div>
            </div>
          </div>

          <div>
            <label id="auth-identifier-label" style="display:block;font-size:11px;font-weight:600;color:#cbd5e1;margin-bottom:4px;">${isSignUp ? 'Email Address *' : 'Email Address or Mobile Number *'}</label>
            <input type="text" id="auth-identifier" placeholder="subham@example.com or 9876543210" required style="width:100%;box-sizing:border-box;background:#020617;border:1px solid #334155;border-radius:8px;padding:9px 12px;color:#ffffff;font-size:13px;outline:none;" />
          </div>

          <div>
            <label style="display:block;font-size:11px;font-weight:600;color:#cbd5e1;margin-bottom:4px;">Password *</label>
            <input type="password" id="auth-password" placeholder="••••••••" required style="width:100%;box-sizing:border-box;background:#020617;border:1px solid #334155;border-radius:8px;padding:9px 12px;color:#ffffff;font-size:13px;outline:none;" />
            <span style="display:block;font-size:10px;color:#64748b;margin-top:3px;">Must contain at least 8 characters, a letter, a number, and @ or #.</span>
          </div>

          <div id="cso-auth-error" style="display:none;background:rgba(244,63,94,0.15);border:1px solid rgba(244,63,94,0.3);color:#fda4af;padding:8px 12px;border-radius:6px;font-size:12px;line-height:1.4;"></div>

          <button type="submit" id="cso-auth-submit-btn" style="width:100%;background:#0d9488;color:#ffffff;font-size:13px;font-weight:700;padding:11px;border:none;border-radius:8px;cursor:pointer;transition:background 0.2s;box-shadow:0 4px 12px rgba(13,148,136,0.25);margin-top:4px;">
            ${isSignUp ? 'Create Candidate Account' : 'Sign In to Portal'}
          </button>

          <!-- Quick Action: Guest Access -->
          <div style="position:relative;text-align:center;margin:4px 0;">
            <div style="position:absolute;inset:0;display:flex;align-items:center;"><div style="width:100%;border-top:1px solid #1e293b;"></div></div>
            <span style="position:relative;background:#0f172a;padding:0 8px;font-size:10px;text-transform:uppercase;color:#64748b;font-weight:600;">or</span>
          </div>

          <button type="button" id="cso-auth-guest-btn" style="width:100%;background:#1e293b;border:1px solid #334155;color:#e2e8f0;font-size:12px;font-weight:600;padding:9px;border-radius:8px;cursor:pointer;transition:background 0.2s;">
            ⚡ Continue as Guest (Offline Local Session)
          </button>
        </form>
      </div>
    `;

    // Show modal
    modal.style.display = 'flex';
    requestAnimationFrame(() => {
      modal.style.opacity = '1';
    });

    // Wire Close
    const closeBtn = document.getElementById('cso-auth-close-btn');
    if (closeBtn) closeBtn.onclick = closeModal;

    modal.onclick = function(e) {
      if (e.target === modal) closeModal();
    };

    function closeModal() {
      modal.style.opacity = '0';
      setTimeout(() => {
        modal.style.display = 'none';
      }, 250);
    }

    // Wire Tab Switching
    const tabLogin = document.getElementById('tab-login');
    const tabSignup = document.getElementById('tab-signup');
    const signupFields = document.getElementById('cso-signup-fields');
    const submitBtn = document.getElementById('cso-auth-submit-btn');
    const idLabel = document.getElementById('auth-identifier-label');
    const errBox = document.getElementById('cso-auth-error');

    function showError(msg) {
      if (errBox) {
        errBox.textContent = msg;
        errBox.style.display = 'block';
      }
    }

    function clearError() {
      if (errBox) {
        errBox.textContent = '';
        errBox.style.display = 'none';
      }
    }

    if (tabLogin && tabSignup && signupFields && submitBtn) {
      tabLogin.onclick = () => {
        clearError();
        signupFields.style.display = 'none';
        tabLogin.style.background = '#0f172a';
        tabLogin.style.color = '#2dd4bf';
        tabLogin.style.borderBottom = '2px solid #0d9488';
        tabSignup.style.background = 'transparent';
        tabSignup.style.color = '#94a3b8';
        tabSignup.style.borderBottom = 'none';
        if (idLabel) idLabel.textContent = 'Email Address or Mobile Number *';
        submitBtn.textContent = 'Sign In to Portal';
      };

      tabSignup.onclick = () => {
        clearError();
        signupFields.style.display = 'flex';
        tabSignup.style.background = '#0f172a';
        tabSignup.style.color = '#2dd4bf';
        tabSignup.style.borderBottom = '2px solid #0d9488';
        tabLogin.style.background = 'transparent';
        tabLogin.style.color = '#94a3b8';
        tabLogin.style.borderBottom = 'none';
        if (idLabel) idLabel.textContent = 'Email Address *';
        submitBtn.textContent = 'Create Candidate Account';
      };
    }

    // Form submission
    const form = document.getElementById('cso-auth-form');

    if (form) {
      form.onsubmit = async function(e) {
        e.preventDefault();
        clearError();

        const isSignUpMode = signupFields.style.display !== 'none';
        const identifier = document.getElementById('auth-identifier')?.value.trim() || '';
        const passwordVal = document.getElementById('auth-password')?.value || '';

        // Validation 1: Password rules
        if (!passwordVal) {
          showError('Please enter your password.');
          return;
        }

        if (isSignUpMode) {
          if (passwordVal.length < 8) {
            showError('Password must contain at least 8 characters.');
            return;
          }
          if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z0-9]*[@#][A-Za-z0-9]*$/.test(passwordVal)) {
            showError('Password must use letters, numbers and exactly one @ or # special symbol.');
            return;
          }
        }

        const accounts = getRegisteredAccounts();

        if (isSignUpMode) {
          // Sign Up Path
          const nameInput = document.getElementById('auth-name');
          const mobileInput = document.getElementById('auth-mobile');
          const dobInput = document.getElementById('auth-dob');
          const districtSelect = document.getElementById('auth-district');

          const nameVal = nameInput?.value.trim() || '';
          const emailVal = identifier.toLowerCase();
          const mobileVal = mobileInput?.value.trim() || '';
          const districtVal = districtSelect?.value || 'Balasore (Baleswar)';
          const dobVal = dobInput?.value || '2000-08-15';
          const checkedExams = Array.from(document.querySelectorAll('input[name="auth-exam"]:checked')).map(cb => cb.value);

          if (!nameVal) {
            showError('Please enter your full name.');
            return;
          }

          if (!emailVal || !emailVal.includes('@') || emailVal.length > 254) {
            showError('Please enter a valid candidate email address.');
            return;
          }

          if (!/^[6-9][0-9]{9}$/.test(mobileVal)) {
            showError('Please enter a valid 10-digit Indian mobile number starting with 6-9.');
            return;
          }

          // Duplicate checks
          const emailExists = accounts.some(acc => (acc.email || '').toLowerCase() === emailVal);
          if (emailExists) {
            showError(`An account with email "${emailVal}" is already registered. Please Sign In.`);
            return;
          }

          const mobileExists = accounts.some(acc => (acc.mobile || '').replace(/\D/g, '') === mobileVal.replace(/\D/g, ''));
          if (mobileExists) {
            showError(`An account with mobile number "${mobileVal}" is already registered. Please Sign In.`);
            return;
          }

          // Optional remote auth attempt
          if (window.CSOAuth && typeof window.CSOAuth.register === 'function') {
            try {
              await window.CSOAuth.register({
                email: emailVal,
                fullName: nameVal,
                password: passwordVal,
                phone: mobileVal,
                dateOfBirth: dobVal,
                state: 'Odisha',
                district: districtVal
              });
            } catch (err) {
              console.warn('Backend service offline, proceeding with verified local vault account');
            }
          }

          // Create new Vault Account
          const targetExamsList = checkedExams.length > 0
            ? checkedExams.map(id => TARGET_EXAMS.find(x => x.id === id)?.label || id)
            : ['OPSC OCS', 'OSSC CGL'];

          const newAccount = {
            id: generateAccountId(),
            fullName: nameVal,
            email: emailVal,
            mobile: mobileVal,
            passwordHash: hashPassword(passwordVal),
            dob: dobVal,
            state: 'Odisha',
            district: districtVal,
            targetExams: targetExamsList,
            registeredAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
            failedLoginAttempts: 0,
            lockoutUntil: null
          };

          accounts.push(newAccount);
          saveRegisteredAccounts(accounts);

          // Establish candidate session
          setCandidateSession({
            ...newAccount,
            name: newAccount.fullName,
            phone: newAccount.mobile,
            isAuthenticated: true,
            sessionType: 'local_verified'
          });

          closeModal();
          window.location.href = '/student-dashboard/';

        } else {
          // Login Path
          if (!identifier) {
            showError('Please enter your email or mobile number.');
            return;
          }

          const searchKey = identifier.toLowerCase();
          const isPhone = !searchKey.includes('@');
          const cleanPhone = searchKey.replace(/\D/g, '');

          let account = accounts.find(acc => {
            if (isPhone && cleanPhone.length >= 10) {
              return (acc.mobile || '').replace(/\D/g, '').endsWith(cleanPhone);
            }
            return (acc.email || '').toLowerCase() === searchKey;
          });

          const now = Date.now();

          // Check account lockout
          if (account && account.lockoutUntil && account.lockoutUntil > now) {
            const minutesLeft = Math.ceil((account.lockoutUntil - now) / 60000);
            showError(`Account is temporarily locked due to multiple failed login attempts. Please try again in ${minutesLeft} minute(s).`);
            return;
          }

          // Optional remote auth attempt
          let remoteLoginOk = false;
          if (window.CSOAuth && typeof window.CSOAuth.login === 'function') {
            try {
              const res = await window.CSOAuth.login({
                email: identifier,
                password: passwordVal
              });
              if (res && res.ok) remoteLoginOk = true;
            } catch (err) {
              console.warn('Backend service offline, proceeding with local vault verification');
            }
          }

          // Verify credentials in Vault
          const computedHash = hashPassword(passwordVal);

          if (!account) {
            // If account is not in vault yet, allow graceful fallback for legacy sessions or create verified record
            const legacySession = getCandidateSession();
            if (legacySession && (legacySession.email === identifier || legacySession.mobile === identifier)) {
              account = {
                id: generateAccountId(),
                fullName: legacySession.fullName || legacySession.name || 'Candidate Aspirant',
                email: legacySession.email || identifier,
                mobile: legacySession.mobile || legacySession.phone || '',
                passwordHash: computedHash,
                dob: legacySession.dob || '15-08-2000',
                state: legacySession.state || 'Odisha',
                district: legacySession.district || 'Balasore (Baleswar)',
                targetExams: legacySession.targetExams || ['OPSC OCS', 'OSSC CGL'],
                registeredAt: legacySession.registeredAt || new Date().toISOString(),
                lastLoginAt: new Date().toISOString(),
                failedLoginAttempts: 0,
                lockoutUntil: null
              };
              accounts.push(account);
              saveRegisteredAccounts(accounts);
            } else {
              showError('No account found with this email or mobile number. Please check your credentials or click "Create Account".');
              return;
            }
          }

          // Credential Check
          if (account.passwordHash && account.passwordHash !== computedHash && !remoteLoginOk) {
            account.failedLoginAttempts = (account.failedLoginAttempts || 0) + 1;
            if (account.failedLoginAttempts >= 5) {
              account.lockoutUntil = now + (15 * 60 * 1000); // 15-minute lockout
              saveRegisteredAccounts(accounts);
              showError('Too many incorrect login attempts. Your account is temporarily locked for 15 minutes.');
              return;
            }
            saveRegisteredAccounts(accounts);
            const remaining = 5 - account.failedLoginAttempts;
            showError(`Incorrect password. You have ${remaining} attempt(s) remaining before account lockout.`);
            return;
          }

          // Successful Authentication
          account.failedLoginAttempts = 0;
          account.lockoutUntil = null;
          account.lastLoginAt = new Date().toISOString();
          saveRegisteredAccounts(accounts);

          setCandidateSession({
            ...account,
            name: account.fullName,
            phone: account.mobile,
            isAuthenticated: true,
            sessionType: 'local_verified'
          });

          closeModal();
          window.location.href = '/student-dashboard/';
        }
      };
    }

    // Guest session
    const guestBtn = document.getElementById('cso-auth-guest-btn');
    if (guestBtn) {
      guestBtn.onclick = function() {
        setCandidateSession({
          name: 'Odisha Aspirant',
          email: 'guest@csodisha.com',
          phone: '',
          district: 'Khordha (Bhubaneswar)',
          targetExams: ['opsc', 'ossc', 'schemes'],
          isGuest: true
        });
        closeModal();
        window.location.href = '/student-dashboard/';
      };
    }
  }

  // Intercept all Login / Sign Up buttons across the page
  function attachAuthTriggers() {
    document.addEventListener('click', function(e) {
      const target = e.target.closest('a, button');
      if (!target) return;

      const href = target.getAttribute('href') || '';
      const text = (target.textContent || '').trim().toLowerCase();
      const id = target.id || '';
      const cls = target.className || '';

      if (
        href.includes('#login') ||
        href.includes('#signup') ||
        id === 'li' || id === 'su' || id === 'cso-m-li' || id === 'cso-m-su' ||
        cls.includes('login-btn') || cls.includes('signup-btn') ||
        cls.includes('cso-login-button') ||
        (text === 'login' && !cls.includes('btn-candidate-logout')) ||
        text === 'sign up'
      ) {
        e.preventDefault();
        e.stopPropagation();
        const mode = href.includes('signup') || id === 'su' || id === 'cso-m-su' || cls.includes('signup') || text === 'sign up' ? 'signup' : 'login';
        renderAuthModal(mode);
      }
    }, true);
  }

  // Initialize
  function init() {
    seedVaultFromSession();
    updateHeaderAuthElements();
    attachAuthTriggers();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.CSOCandidateAuth = {
    getSession: getCandidateSession,
    setSession: setCandidateSession,
    clearSession: clearCandidateSession,
    openModal: renderAuthModal,
    updateHeader: updateHeaderAuthElements,
    getVault: getRegisteredAccounts,
    saveVault: saveRegisteredAccounts,
    hashPassword: hashPassword
  };

})(window);
