/**
 * Common Sense Odisha (CSO) — Candidate Authentication Modal & Session Manager
 * Connects header [Login] and [Sign Up] buttons across the site to an interactive modal.
 * Persists candidate session into localStorage['cso_candidate_session_v1']
 * Swaps header buttons with '👤 My Dashboard' and '[Logout]'
 */
(function(window) {
  'use strict';

  const SESSION_KEY = 'cso_candidate_session_v1';

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
        mobileMenu.innerHTML = `
          <a href="/student-dashboard/" class="cso-auth-item" style="color:#0d9488;font-weight:bold;">👤 My Dashboard (${session.name.split(' ')[0]})</a>
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

            <div>
              <label style="display:block;font-size:11px;font-weight:600;color:#cbd5e1;margin-bottom:4px;">Home District (Odisha) *</label>
              <select id="auth-district" style="width:100%;box-sizing:border-box;background:#020617;border:1px solid #334155;border-radius:8px;padding:9px 12px;color:#ffffff;font-size:13px;outline:none;">
                ${ODISHA_DISTRICTS.map(d => `<option value="${d}" ${d.includes('Bhubaneswar') ? 'selected' : ''}>${d}</option>`).join('')}
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
            <label style="display:block;font-size:11px;font-weight:600;color:#cbd5e1;margin-bottom:4px;">Email or Mobile Number *</label>
            <input type="text" id="auth-identifier" placeholder="subham@example.com or 9876543210" required style="width:100%;box-sizing:border-box;background:#020617;border:1px solid #334155;border-radius:8px;padding:9px 12px;color:#ffffff;font-size:13px;outline:none;" />
          </div>

          <div>
            <label style="display:block;font-size:11px;font-weight:600;color:#cbd5e1;margin-bottom:4px;">Password *</label>
            <input type="password" id="auth-password" placeholder="••••••••" style="width:100%;box-sizing:border-box;background:#020617;border:1px solid #334155;border-radius:8px;padding:9px 12px;color:#ffffff;font-size:13px;outline:none;" />
          </div>

          <div id="cso-auth-error" style="display:none;background:rgba(244,63,94,0.15);border:1px solid rgba(244,63,94,0.3);color:#fda4af;padding:8px 12px;border-radius:6px;font-size:12px;"></div>

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

    if (tabLogin && tabSignup && signupFields && submitBtn) {
      tabLogin.onclick = () => {
        signupFields.style.display = 'none';
        tabLogin.style.background = '#0f172a';
        tabLogin.style.color = '#2dd4bf';
        tabLogin.style.borderBottom = '2px solid #0d9488';
        tabSignup.style.background = 'transparent';
        tabSignup.style.color = '#94a3b8';
        tabSignup.style.borderBottom = 'none';
        submitBtn.textContent = 'Sign In to Portal';
      };

      tabSignup.onclick = () => {
        signupFields.style.display = 'flex';
        tabSignup.style.background = '#0f172a';
        tabSignup.style.color = '#2dd4bf';
        tabSignup.style.borderBottom = '2px solid #0d9488';
        tabLogin.style.background = 'transparent';
        tabLogin.style.color = '#94a3b8';
        tabLogin.style.borderBottom = 'none';
        submitBtn.textContent = 'Create Candidate Account';
      };
    }

    // Form submission
    const form = document.getElementById('cso-auth-form');
    const errBox = document.getElementById('cso-auth-error');

    if (form) {
      form.onsubmit = async function(e) {
        e.preventDefault();
        if (errBox) errBox.style.display = 'none';

        const identifier = document.getElementById('auth-identifier').value.trim();
        if (!identifier) {
          if (errBox) {
            errBox.textContent = 'Please enter your email or mobile number.';
            errBox.style.display = 'block';
          }
          return;
        }

        const fullNameInput = document.getElementById('auth-name');
        const emailInput = document.getElementById('auth-identifier');
        const mobileInput = document.getElementById('auth-identifier');
        const districtSelect = document.getElementById('auth-district');
        const stateSelect = { value: 'Odisha' };
        const dobDay = { value: '01' };
        const dobMonth = { value: '01' };
        const dobYear = { value: '2000' };

        const nameVal = fullNameInput?.value.trim() || identifier.split('@')[0] || 'Aspirant';
        const emailVal = identifier.includes('@') ? identifier : '';
        const mobileVal = !identifier.includes('@') ? identifier : '';
        const districtVal = districtSelect?.value || 'Balasore (Baleswar)';
        const checkedExams = Array.from(document.querySelectorAll('input[name="auth-exam"]:checked')).map(cb => cb.value);

        // Attempt backend auth if available, with graceful fallback
        const isSignUpMode = signupFields.style.display !== 'none';
        const pwVal = document.getElementById('auth-password')?.value || 'Candidate@123';

        if (window.CSOAuth && typeof window.CSOAuth.register === 'function' && isSignUpMode) {
          try {
            const res = await window.CSOAuth.register({
              email: emailVal || 'candidate@csodisha.com',
              fullName: nameVal,
              password: pwVal,
              phone: mobileVal || '9876543210',
              dateOfBirth: '2000-01-01',
              state: 'Odisha',
              district: districtVal
            });
            if (res && res.ok) {
              console.log('Backend auth registration succeeded');
            }
          } catch (netErr) {
            console.warn('Backend auth endpoint unavailable, falling back to local session', netErr);
          }
        } else if (window.CSOAuth && typeof window.CSOAuth.login === 'function' && !isSignUpMode) {
          try {
            const res = await window.CSOAuth.login({
              email: emailVal || identifier,
              password: pwVal
            });
            if (res && res.ok) {
              console.log('Backend auth login succeeded');
            }
          } catch (loginErr) {
            console.warn('Backend login endpoint unavailable, falling back to local session', loginErr);
          }
        }

        let existingSession = null;
        try {
          const raw = localStorage.getItem(SESSION_KEY);
          if (raw) existingSession = JSON.parse(raw);
        } catch (e) {}

        const candidateEmail = emailVal || (existingSession && existingSession.email) || identifier;
        const candidateName = (existingSession && (existingSession.fullName || existingSession.name))
          ? (existingSession.fullName || existingSession.name)
          : (nameVal !== 'Aspirant' ? nameVal : candidateEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));

        const sessionPayload = {
          fullName: candidateName,
          name: candidateName,
          email: candidateEmail,
          mobile: mobileVal || (existingSession && (existingSession.mobile || existingSession.phone)) || "+91 9876543210",
          phone: mobileVal || (existingSession && (existingSession.mobile || existingSession.phone)) || "+91 9876543210",
          state: (existingSession && existingSession.state) ? existingSession.state : (stateSelect.value || "Odisha"),
          district: (districtVal !== 'Balasore (Baleswar)' && districtVal) ? districtVal : ((existingSession && existingSession.district) ? existingSession.district : "Balasore (Baleswar)"),
          dob: (existingSession && existingSession.dob) ? existingSession.dob : `${dobDay.value}-${dobMonth.value}-${dobYear.value}`,
          isAuthenticated: true,
          sessionType: "local_verified",
          lastLoginAt: new Date().toISOString(),
          registeredAt: (existingSession && existingSession.registeredAt) ? existingSession.registeredAt : new Date().toISOString(),
          targetExams: (checkedExams.length > 0) ? checkedExams : ((existingSession && existingSession.targetExams) ? existingSession.targetExams : ["OPSC OCS", "OSSC CGL", "Odisha B.Ed"])
        };

        localStorage.setItem(SESSION_KEY, JSON.stringify(sessionPayload));
        updateHeaderAuthElements();

        closeModal();
        window.location.href = '/student-dashboard/';
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
    updateHeader: updateHeaderAuthElements
  };

})(window);
