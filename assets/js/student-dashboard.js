/**
 * Common Sense Odisha (CSO) — Student Dashboard Portal Logic
 * Hydrates candidate dashboard from SuperStore state engines:
 * - cso_events_schedule_tree_v1: Active Exam Milestones & Countdown Timers
 * - cso_study_recursive_tree_v1: Saved Syllabi & PYQ Shelf with Cloudflare R2 downloads
 * - cso_schemes_recursive_tree_v2: Matching Scholarships & Direct Benefit Schemes
 * - cso_candidate_checklist_v1: Interactive multi-stage exam preparation checklists & milestones
 * - cso_candidate_session_v1 & cso_registered_accounts_v1: Candidate Profile & Preference editing
 */
(function(window) {
  'use strict';

  const SESSION_KEY = 'cso_candidate_session_v1';
  const CHECKLIST_KEY = 'cso_candidate_checklist_v1';
  const VAULT_KEY = 'cso_registered_accounts_v1';

  const ODISHA_DISTRICTS = [
    "Angul", "Balangir", "Balasore (Baleswar)", "Bargarh", "Bhadrak", "Boudh",
    "Cuttack", "Deogarh", "Dhenkanal", "Gajapati", "Ganjam", "Jagatsinghpur",
    "Jajpur", "Jharsuguda", "Kalahandi", "Kandhamal", "Kendrapara", "Kendujhar",
    "Khordha (Bhubaneswar)", "Koraput", "Malkangiri", "Mayurbhanj", "Nabarangpur",
    "Nayagarh", "Nuapada", "Puri", "Rayagada", "Sambalpur", "Subarnapur", "Sundargarh"
  ];

  // Comprehensive Exam Syllabi & Stage Milestones
  const SYLLABUS_CHECKLISTS = {
    opsc: {
      name: "OPSC Odisha Civil Services (OCS / OAS / OFS)",
      stages: [
        {
          id: "opsc-prelims",
          title: "Stage I: Preliminary Examination (Objective)",
          topics: [
            { id: "opsc-p-gs1-hist", label: "History of India & Indian National Movement (Odisha Emphasis)" },
            { id: "opsc-p-gs1-geo", label: "Indian & Odisha Physical, Social, Economic Geography" },
            { id: "opsc-p-gs1-pol", label: "Indian Polity & Governance, Odisha Panchayati Raj, Public Policy" },
            { id: "opsc-p-gs1-eco", label: "Economic & Social Development, Sustainable Development Goals" },
            { id: "opsc-p-gs1-env", label: "General Issues on Ecology, Biodiversity, Odisha Wildlife Sanctuaries" },
            { id: "opsc-p-gs1-sci", label: "General Science & Emerging Science & Tech Innovations" },
            { id: "opsc-p-gs2-csat", label: "Paper-II (CSAT): Comprehension, Interpersonal Skills & Communication" },
            { id: "opsc-p-gs2-quant", label: "Paper-II (CSAT): Logical Reasoning, Basic Numeracy (Class X standard)" }
          ]
        },
        {
          id: "opsc-mains",
          title: "Stage II: Main Written Examination (Descriptive)",
          topics: [
            { id: "opsc-m-odia", label: "Paper I: Odia Language Qualifying (Essay, Translation, Grammar)" },
            { id: "opsc-m-eng", label: "Paper II: English Qualifying (Precis, Comprehension, Usage)" },
            { id: "opsc-m-essay", label: "Paper III: English Essay Writing (Socio-Economic & Philosophical)" },
            { id: "opsc-m-gs1", label: "Paper IV: General Studies I (Indian Heritage, Culture & Odisha Heritage)" },
            { id: "opsc-m-gs2", label: "Paper V: General Studies II (Governance, Constitution, Polity & IR)" },
            { id: "opsc-m-gs3", label: "Paper VI: General Studies III (Technology, Economic Development, Disaster)" },
            { id: "opsc-m-gs4", label: "Paper VII: General Studies IV (Ethics, Integrity & Case Studies)" },
            { id: "opsc-m-opt1", label: "Paper VIII & IX: Optional Subject Paper I & II Revision" }
          ]
        },
        {
          id: "opsc-viva",
          title: "Stage III: Personality Test & Interview",
          topics: [
            { id: "opsc-v-daf", label: "Detailed Application Form (DAF) Background & Hobby Revision" },
            { id: "opsc-v-dist", label: "Home District Socio-Economic Profile & Local Issues Preparation" },
            { id: "opsc-v-mock", label: "2+ Board Mock Interviews & Confidence Building Drills" }
          ]
        }
      ]
    },
    ossc: {
      name: "OSSC Combined Graduate Level (CGL) & CHSL",
      stages: [
        {
          id: "ossc-stage1",
          title: "Stage I: Preliminary Examination (CBRE / OMR)",
          topics: [
            { id: "ossc-p-arith", label: "Arithmetic & Advanced Mathematics (10th/12th Standard Speed Drills)" },
            { id: "ossc-p-di", label: "Data Interpretation (Charts, Graphs, Tables & Data Sufficiency)" },
            { id: "ossc-p-reason", label: "Logical Reasoning, Analytical Ability & Mental Agility" },
            { id: "ossc-p-current", label: "Current Events of National & International Importance" },
            { id: "ossc-p-comp", label: "Computer & Internet Awareness (MS Office, OS, Networking)" }
          ]
        },
        {
          id: "ossc-stage2",
          title: "Stage II: Main Written Examination",
          topics: [
            { id: "ossc-m-odia", label: "Odia Language Competency (Grammar, Vocabulary & Comprehension)" },
            { id: "ossc-m-eng", label: "English Language Competency (Sentence Correction, Idioms, Vocab)" },
            { id: "ossc-m-gs", label: "General Studies (Odisha History, Geography, Environment & Polity)" }
          ]
        },
        {
          id: "ossc-skill",
          title: "Stage III: Computer Skill Test & Certificate Verification",
          topics: [
            { id: "ossc-s-word", label: "MS Word Document Formatting & Tabular Structure Drills" },
            { id: "ossc-s-excel", label: "MS Excel Formulas, Functions, Pivot Tables & Data Sorting" },
            { id: "ossc-s-ppt", label: "MS PowerPoint Slide Preparation with Formatting Requirements" }
          ]
        }
      ]
    },
    osssc: {
      name: "OSSSC District Cadre (RI / ARI / Amin / ICDS)",
      stages: [
        {
          id: "osssc-prelims",
          title: "Stage I: Preliminary Screening Test",
          topics: [
            { id: "osssc-p-math", label: "Mathematics (Fractions, Percentages, Ratio, Profit & Loss, Mensuration)" },
            { id: "osssc-p-gs", label: "General Knowledge & Odisha Special State Geography/History" },
            { id: "osssc-p-eng", label: "English Grammar (Articles, Prepositions, Tense, Active/Passive)" },
            { id: "osssc-p-odia", label: "Odia Grammar (Shabdabibhaktie, Sandhi, Samasa, Krudanta)" },
            { id: "osssc-p-reason", label: "Logical & Non-Verbal Reasoning Series" }
          ]
        },
        {
          id: "osssc-mains",
          title: "Stage II: Main Examination & Practical Test",
          topics: [
            { id: "osssc-m-math", label: "Advanced Practical Mathematics Paper" },
            { id: "osssc-m-comp", label: "Practical Skill Test in MS Office (Word, Excel & Powerpoint)" },
            { id: "osssc-m-typing", label: "Typing Test Speed in English & Odia Font Drills" }
          ]
        }
      ]
    },
    teaching: {
      name: "Odisha B.Ed Entrance & Teacher Eligibility (OTET / OSSTET)",
      stages: [
        {
          id: "bed-paper1",
          title: "Paper I: General Section (Compulsory for All Streams)",
          topics: [
            { id: "bed-p1-eng", label: "General English Comprehension, Vocabulary & Sentence Structure" },
            { id: "bed-p1-odia", label: "Odia Grammar, Dhwani, Barna, Sabdaprakarana & Bakyabibhaga" },
            { id: "bed-p1-gk", label: "General Awareness, NEP 2020 & Odisha Education Policy Initiatives" },
            { id: "bed-p1-reason", label: "Reasoning Ability & Analytical Judgment" },
            { id: "bed-p1-aptitude", label: "Teaching Aptitude, Classroom Management & Child Psychology" }
          ]
        },
        {
          id: "bed-paper2-arts",
          title: "Paper II (Arts Stream): Subject Specialization",
          topics: [
            { id: "bed-p2-hist", label: "History & Political Science (Indian Freedom Movement, Constitution)" },
            { id: "bed-p2-geo", label: "Geography & Economics (Physical Geography, Natural Resources)" },
            { id: "bed-p2-eng-odia", label: "English & Odia Language Literature Concepts" }
          ]
        },
        {
          id: "bed-paper2-sci",
          title: "Paper II (Science Stream): Subject Specialization",
          topics: [
            { id: "bed-p2-phy-chem", label: "Physical Science (Atomic Structure, Chemical Reactions, Motion)" },
            { id: "bed-p2-bio", label: "Biological Science (Cell Biology, Plant/Animal Nutrition, Genetics)" },
            { id: "bed-p2-math", label: "Mathematics (Number System, Algebra, Geometry & Trigonometry)" }
          ]
        }
      ]
    },
    police: {
      name: "Odisha Police Recruitment (Sub-Inspector & Constable)",
      stages: [
        {
          id: "police-cbre",
          title: "Written Examination (Computer Based Recruitment)",
          topics: [
            { id: "pol-p1-odia", label: "Paper I: Odia Language Comprehension & Descriptive Translation" },
            { id: "pol-p1-eng", label: "Paper I: English Language Composition, Precis & Correct Usage" },
            { id: "pol-p2-gs", label: "Paper II: General Studies, Current Affairs & National Security" },
            { id: "pol-p2-quant", label: "Paper II: Quantitative Aptitude & Mental Ability" },
            { id: "pol-p2-computer", label: "Paper II: Basic Computer Fundamentals & Cyber Awareness" }
          ]
        },
        {
          id: "police-pmt-pet",
          title: "Physical Measurement & Physical Efficiency Test (PET/PMT)",
          topics: [
            { id: "pol-pet-run", label: "1.6 KM Running Practice (Target Time: < 6.5 Minutes)" },
            { id: "pol-pet-jump", label: "Broad Jump (Long Jump Qualification Target: 3.66 Meters)" },
            { id: "pol-pmt-measure", label: "Height & Chest Standard Verification Check" }
          ]
        }
      ]
    },
    schemes: {
      name: "Odisha Student Scholarships & Welfare Schemes",
      stages: [
        {
          id: "schemes-doc",
          title: "Eligibility Documents & KYC Readiness",
          topics: [
            { id: "sch-aadhaar", label: "Aadhaar Card Linked with Active Bank Account (DBT Enabled)" },
            { id: "sch-income", label: "Resident / Domicile & Valid Income Certificate from Tahasildar" },
            { id: "sch-caste", label: "Caste Certificate (ST / SC / OBC / SEBC) verified via e-District" },
            { id: "sch-marksheet", label: "Previous Year Final Academic Marksheets & College Bonafide" },
            { id: "sch-portal-app", label: "Online Submission on Odisha State Scholarship Portal (scholarship.odisha.gov.in)" }
          ]
        }
      ]
    }
  };

  function getSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) return JSON.parse(raw);
    } catch(e) {}
    return null;
  }

  function getSavedChecklists() {
    try {
      const raw = localStorage.getItem(CHECKLIST_KEY);
      if (raw) return JSON.parse(raw);
    } catch(e) {}
    return {};
  }

  function saveChecklists(obj) {
    try {
      localStorage.setItem(CHECKLIST_KEY, JSON.stringify(obj));
    } catch(e) {}
  }

  // Toast Notification Utility
  function showToast(message, type = 'success') {
    let container = document.getElementById('cso-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'cso-toast-container';
      container.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:999999;display:flex;flex-direction:column;gap:8px;pointer-events:none;';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.style.cssText = `
      padding:10px 18px;border-radius:8px;font-size:13px;font-weight:600;color:#ffffff;
      background:${type === 'success' ? '#0d9488' : '#ef4444'};
      box-shadow:0 8px 24px rgba(0,0,0,0.35);display:flex;align-items:center;gap:8px;
      pointer-events:auto;transition:opacity 0.3s, transform 0.3s;opacity:0;transform:translateY(10px);
    `;
    toast.innerHTML = `<span>${type === 'success' ? '✓' : '⚠'}</span><span>${message}</span>`;
    container.appendChild(toast);
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  // Render Hero Section
  function renderHero(session) {
    const heroEl = document.getElementById('candidate-profile-hero');
    if (!heroEl) return;

    if (!session) {
      heroEl.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;text-align:center;gap:12px;padding:24px;">
          <span style="font-size:32px;">👤</span>
          <h1 style="font-size:22px;font-weight:800;color:#f8fafc;margin:0;">Welcome to CSO Student Portal</h1>
          <p style="font-size:13px;color:#94a3b8;max-width:540px;margin:0;">You are currently viewing the guest preview state. Sign in or create a free profile to track your examination dates, bookmark PYQs, and monitor eligibility.</p>
          <div style="display:flex;gap:10px;margin-top:8px;">
            <button type="button" id="btn-portal-login" style="background:#0d9488;color:#fff;border:none;border-radius:8px;padding:9px 18px;font-size:13px;font-weight:700;cursor:pointer;">Sign In / Create Account</button>
            <button type="button" id="btn-portal-quick-guest" style="background:#1e293b;border:1px solid #334155;color:#e2e8f0;border-radius:8px;padding:9px 18px;font-size:13px;font-weight:600;cursor:pointer;">Initialize Offline Profile</button>
          </div>
        </div>
      `;
      document.getElementById('btn-portal-login')?.addEventListener('click', () => {
        window.CSOCandidateAuth?.openModal('login');
      });
      document.getElementById('btn-portal-quick-guest')?.addEventListener('click', () => {
        if (window.CSOCandidateAuth && typeof window.CSOCandidateAuth.setSession === 'function') {
          window.CSOCandidateAuth.setSession({
            name: "Odisha Aspirant",
            email: "aspirant@csodisha.com",
            district: "Khordha (Bhubaneswar)",
            targetExams: ["opsc", "ossc", "schemes"],
            isGuest: true
          });
          window.location.reload();
        }
      });
      return;
    }

    const examTags = (session.targetExams || ['opsc', 'ossc']).map(e => {
      const labels = {
        opsc: 'OPSC (OCS/OAS)',
        ossc: 'OSSC (CGL/CHSL)',
        osssc: 'OSSSC (RI/ARI)',
        teaching: 'Odisha B.Ed / OTET',
        police: 'Odisha Police',
        schemes: 'Scholarships & Welfare'
      };
      return `<span style="background:rgba(13,148,136,0.2);color:#2dd4bf;border:1px solid rgba(13,148,136,0.3);font-size:10px;font-weight:600;padding:2px 8px;border-radius:6px;font-family:monospace;">${labels[e] || e.toUpperCase()}</span>`;
    }).join(' ');

    const candidateName = session.fullName || session.name || 'Candidate Aspirant';
    const candidateContact = session.mobile || session.phone || session.email || 'Verified Session';

    heroEl.innerHTML = `
      <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:16px;">
        <div style="display:flex;align-items:center;gap:16px;">
          <div style="width:54px;height:54px;border-radius:14px;background:#0d9488;color:#ffffff;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:800;box-shadow:0 4px 12px rgba(13,148,136,0.3);flex-shrink:0;">
            ${candidateName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
              <h1 style="font-size:20px;font-weight:800;color:#f8fafc;margin:0;">Namaskar, ${candidateName}!</h1>
              <span style="background:rgba(16,185,129,0.15);color:#34d399;font-size:10px;padding:2px 6px;border-radius:4px;font-weight:700;">Verified Aspirant</span>
            </div>
            <p style="font-size:12px;color:#94a3b8;margin:4px 0 0;">District: <strong style="color:#e2e8f0;">${session.district || 'Khordha (Bhubaneswar)'}</strong> • <span>${candidateContact}</span></p>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;">
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;justify-content:flex-end;">
            ${examTags}
          </div>
          <button type="button" id="btn-edit-profile-trigger" style="display:inline-flex;align-items:center;gap:5px;background:#1e293b;border:1px solid #334155;color:#2dd4bf;border-radius:6px;padding:5px 12px;font-size:11px;font-weight:700;cursor:pointer;transition:all 0.2s;">
            <span>✏️ Edit Profile &amp; Preferences</span>
          </button>
        </div>
      </div>
    `;

    document.getElementById('btn-edit-profile-trigger')?.addEventListener('click', () => {
      openProfileEditorModal(session);
    });
  }

  // Profile Editor Modal
  function openProfileEditorModal(currentSession) {
    let existingModal = document.getElementById('cso-profile-editor-modal');
    if (existingModal) existingModal.remove();

    const currentName = currentSession.fullName || currentSession.name || '';
    const currentMobile = currentSession.mobile || currentSession.phone || '';
    const currentDistrict = currentSession.district || 'Khordha (Bhubaneswar)';
    const selectedExams = Array.isArray(currentSession.targetExams) ? currentSession.targetExams : ['opsc', 'ossc'];

    const districtOptions = ODISHA_DISTRICTS.map(d => {
      const isSel = (d.toLowerCase() === currentDistrict.toLowerCase()) || currentDistrict.toLowerCase().includes(d.toLowerCase());
      return `<option value="${d}" ${isSel ? 'selected' : ''}>${d}</option>`;
    }).join('');

    const examCheckboxes = [
      { key: 'opsc', label: 'OPSC (OCS / OAS / OFS)' },
      { key: 'ossc', label: 'OSSC (CGL / CHSL / CTSRE)' },
      { key: 'osssc', label: 'OSSSC (RI / ARI / Amin / Forest Guard)' },
      { key: 'teaching', label: 'Teaching (Odisha B.Ed / OTET / OSSTET)' },
      { key: 'police', label: 'Odisha Police (SI / Constable)' },
      { key: 'schemes', label: 'Welfare Schemes & Scholarships (Subhadra / KALIA)' }
    ].map(item => {
      const isChecked = selectedExams.includes(item.key) || selectedExams.includes(item.key.toUpperCase());
      return `
        <label style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:6px;background:rgba(15,23,42,0.4);border:1px solid #334155;cursor:pointer;font-size:12px;color:#e2e8f0;">
          <input type="checkbox" name="edit_target_exams" value="${item.key}" ${isChecked ? 'checked' : ''} style="width:16px;height:16px;accent-color:#0d9488;cursor:pointer;" />
          <span>${item.label}</span>
        </label>
      `;
    }).join('');

    const modal = document.createElement('div');
    modal.id = 'cso-profile-editor-modal';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,0.8);backdrop-filter:blur(4px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;';

    modal.innerHTML = `
      <div style="background:#0f172a;border:1px solid #334155;border-radius:16px;max-width:520px;width:100%;box-shadow:0 20px 40px rgba(0,0,0,0.6);overflow:hidden;animation:csoFadeIn 0.2s ease-out;">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid #1e293b;background:#1e293b;">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:18px;">✏️</span>
            <h3 style="margin:0;font-size:16px;font-weight:700;color:#f8fafc;">Edit Aspirant Profile &amp; Preferences</h3>
          </div>
          <button type="button" id="btn-close-profile-editor" style="background:transparent;border:none;color:#94a3b8;font-size:18px;cursor:pointer;padding:4px 8px;">✕</button>
        </div>

        <form id="cso-profile-editor-form" style="padding:20px;display:flex;flex-direction:column;gap:16px;max-height:80vh;overflow-y:auto;">
          <div id="profile-editor-error" style="display:none;padding:10px 14px;border-radius:8px;background:rgba(239,68,68,0.15);border:1px solid #ef4444;color:#fca5a5;font-size:12px;"></div>

          <div>
            <label style="display:block;font-size:12px;font-weight:600;color:#cbd5e1;margin-bottom:6px;">Full Name *</label>
            <input type="text" id="edit-candidate-name" value="${currentName}" required style="width:100%;box-sizing:border-box;padding:9px 12px;background:#1e293b;border:1px solid #334155;border-radius:8px;color:#f8fafc;font-size:13px;" />
          </div>

          <div>
            <label style="display:block;font-size:12px;font-weight:600;color:#cbd5e1;margin-bottom:6px;">Mobile Number (10 digits) *</label>
            <input type="tel" id="edit-candidate-mobile" value="${currentMobile}" maxlength="10" required placeholder="9876543210" style="width:100%;box-sizing:border-box;padding:9px 12px;background:#1e293b;border:1px solid #334155;border-radius:8px;color:#f8fafc;font-size:13px;letter-spacing:1px;" />
          </div>

          <div>
            <label style="display:block;font-size:12px;font-weight:600;color:#cbd5e1;margin-bottom:6px;">Home District in Odisha *</label>
            <select id="edit-candidate-district" style="width:100%;box-sizing:border-box;padding:9px 12px;background:#1e293b;border:1px solid #334155;border-radius:8px;color:#f8fafc;font-size:13px;">
              ${districtOptions}
            </select>
          </div>

          <div>
            <label style="display:block;font-size:12px;font-weight:600;color:#cbd5e1;margin-bottom:8px;">Target Examinations &amp; Schemes *</label>
            <div style="display:flex;flex-direction:column;gap:6px;">
              ${examCheckboxes}
            </div>
          </div>

          <div style="display:flex;align-items:center;justify-content:flex-end;gap:10px;margin-top:10px;padding-top:12px;border-top:1px solid #1e293b;">
            <button type="button" id="btn-cancel-profile-editor" style="background:transparent;border:1px solid #475569;color:#cbd5e1;border-radius:8px;padding:8px 16px;font-size:12px;font-weight:600;cursor:pointer;">Cancel</button>
            <button type="submit" id="btn-save-profile-editor" style="background:#0d9488;color:#ffffff;border:none;border-radius:8px;padding:8px 20px;font-size:12px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:6px;">
              <span>Save &amp; Update Portal</span> ✓
            </button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    const closeBtn = document.getElementById('btn-close-profile-editor');
    const cancelBtn = document.getElementById('btn-cancel-profile-editor');
    const closeModal = () => modal.remove();
    closeBtn?.addEventListener('click', closeModal);
    cancelBtn?.addEventListener('click', closeModal);

    const form = document.getElementById('cso-profile-editor-form');
    const errBox = document.getElementById('profile-editor-error');

    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      errBox.style.display = 'none';

      const newName = document.getElementById('edit-candidate-name').value.trim();
      const newMobile = document.getElementById('edit-candidate-mobile').value.trim();
      const newDistrict = document.getElementById('edit-candidate-district').value;
      const checkedBoxes = Array.from(document.querySelectorAll('input[name="edit_target_exams"]:checked'));
      const newExams = checkedBoxes.map(cb => cb.value);

      if (!newName) {
        errBox.textContent = 'Please enter your full name.';
        errBox.style.display = 'block';
        return;
      }

      if (!/^\d{10}$/.test(newMobile)) {
        errBox.textContent = 'Please enter a valid 10-digit mobile number.';
        errBox.style.display = 'block';
        return;
      }

      if (newExams.length === 0) {
        errBox.textContent = 'Please select at least one target exam or scheme.';
        errBox.style.display = 'block';
        return;
      }

      // Update current session object
      const updatedSession = {
        ...currentSession,
        fullName: newName,
        name: newName,
        mobile: newMobile,
        phone: newMobile,
        district: newDistrict,
        targetExams: newExams,
        updatedAt: new Date().toISOString()
      };

      try {
        localStorage.setItem(SESSION_KEY, JSON.stringify(updatedSession));
      } catch(err) {
        console.error('Failed to save updated session', err);
      }

      // Update matching record in persistent vault
      try {
        const rawVault = localStorage.getItem(VAULT_KEY);
        let vault = rawVault ? JSON.parse(rawVault) : [];
        if (Array.isArray(vault)) {
          let updatedInVault = false;
          vault = vault.map(acc => {
            if (
              (acc.email && updatedSession.email && acc.email.toLowerCase() === updatedSession.email.toLowerCase()) ||
              (acc.mobile && updatedSession.mobile && acc.mobile === updatedSession.mobile) ||
              (acc.id && currentSession.id && acc.id === currentSession.id)
            ) {
              updatedInVault = true;
              return {
                ...acc,
                fullName: newName,
                mobile: newMobile,
                district: newDistrict,
                targetExams: newExams,
                updatedAt: new Date().toISOString()
              };
            }
            return acc;
          });

          if (!updatedInVault && vault.length > 0) {
            vault[0].fullName = newName;
            vault[0].mobile = newMobile;
            vault[0].district = newDistrict;
            vault[0].targetExams = newExams;
          }
          localStorage.setItem(VAULT_KEY, JSON.stringify(vault));
        }
      } catch(err) {
        console.warn('Failed to update accounts vault', err);
      }

      // Refresh Dashboard components
      renderHero(updatedSession);
      renderMilestones(updatedSession);
      renderChecklistTracker(updatedSession);

      modal.remove();
      showToast('Profile & Exam Preferences successfully updated!');
    });
  }

  // Active Exam Milestones & Countdown Timers
  function renderMilestones(session) {
    const listEl = document.getElementById('candidate-milestones-list');
    if (!listEl) return;

    let eventsConfig = null;
    if (window.CSOSuperStore && typeof window.CSOSuperStore.getEventsScheduleConfig === 'function') {
      eventsConfig = window.CSOSuperStore.getEventsScheduleConfig();
    }

    let allEvents = [];
    if (eventsConfig && eventsConfig.categories) {
      eventsConfig.categories.forEach(cat => {
        if (cat.nodes) {
          cat.nodes.forEach(n => {
            allEvents.push({ ...n, catTitle: cat.title });
            if (n.children) {
              n.children.forEach(ch => allEvents.push({ ...ch, catTitle: cat.title }));
            }
          });
        }
      });
    }

    if (allEvents.length === 0) {
      allEvents = [
        { id: "EV-01", title: "OPSC Odisha Civil Services (OCS) Prelims 2026", titleOdia: "ଓପିଏସସି ସିଭିଲ ସର୍ଭିସେସ ପ୍ରିଲିମ୍ସ", eventStartDate: "2026-11-29", eventType: "Exam", venueDistrict: "All 30 Districts", officialPortalUrl: "https://opsc.gov.in" },
        { id: "EV-02", title: "OSSC Combined Graduate Level (CGL) Mains 2026", titleOdia: "ଓଏସଏସସି ସିଜିଏଲ ମୁଖ୍ୟ ପରୀକ୍ଷା", eventStartDate: "2026-12-14", eventType: "Exam", venueDistrict: "Bhubaneswar / Cuttack", officialPortalUrl: "https://ossc.gov.in" },
        { id: "EV-03", title: "OSSSC RI & ARI Practical Skill Test Schedule", titleOdia: "ଆରଆଇ ଏବଂ ଏଆରଆଇ କମ୍ପ୍ୟୁଟର ପରୀକ୍ଷା", eventStartDate: "2026-12-22", eventType: "Skill Test", venueDistrict: "District HQs", officialPortalUrl: "https://osssc.gov.in" },
        { id: "EV-04", title: "Odisha B.Ed Entrance Application Form Closing", titleOdia: "ବି.ଏଡ୍ ପ୍ରବେଶିକା ଆବେଦନ ଶେଷ ତାରିଖ", eventStartDate: "2026-12-05", eventType: "Deadline", venueDistrict: "Online State Portal", officialPortalUrl: "https://samsodisha.gov.in" }
      ];
    }

    const now = new Date();
    listEl.innerHTML = allEvents.slice(0, 4).map(ev => {
      let daysLeft = 'Soon';
      let dateStr = ev.eventStartDate || '';
      if (dateStr) {
        const evDate = new Date(dateStr);
        const diffMs = evDate - now;
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays > 0) {
          daysLeft = `${diffDays} days left`;
        } else if (diffDays === 0) {
          daysLeft = 'Today!';
        } else {
          daysLeft = 'Concluded';
        }
      }

      return `
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:12px;border-radius:10px;background:rgba(15,23,42,0.6);border:1px solid #1e293b;">
          <div style="min-width:0;">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;">
              <span style="font-size:10px;padding:1px 6px;border-radius:4px;background:rgba(13,148,136,0.15);color:#2dd4bf;font-weight:700;font-family:monospace;">${ev.eventType || 'Event'}</span>
              <span style="font-size:10px;color:#94a3b8;font-family:monospace;">${ev.eventStartDate || 'TBA'}</span>
            </div>
            <h4 style="font-size:13px;font-weight:700;color:#f8fafc;margin:0;line-height:1.4;">${ev.title}</h4>
            ${ev.titleOdia ? `<p style="font-size:11px;color:#94a3b8;margin:2px 0 0;font-family:serif;">${ev.titleOdia}</p>` : ''}
            <div style="display:flex;align-items:center;gap:8px;margin-top:6px;font-size:10px;color:#64748b;">
              <span>📍 ${ev.venueDistrict || 'Odisha'}</span>
              ${ev.officialPortalUrl ? `• <a href="${ev.officialPortalUrl}" target="_blank" rel="noopener noreferrer" style="color:#0d9488;text-decoration:none;">Commission Portal ↗</a>` : ''}
            </div>
          </div>
          <div style="text-align:right;flex-shrink:0;">
            <span style="display:inline-block;padding:4px 8px;border-radius:6px;font-size:11px;font-weight:700;background:${daysLeft.includes('days') ? '#0f766e' : '#1e293b'};color:#ffffff;font-family:monospace;">
              ${daysLeft}
            </span>
          </div>
        </div>
      `;
    }).join('');
  }

  // Interactive Stream-Specific Exam Preparation Checklist & Milestone Tracker
  let activeChecklistTab = 'opsc';

  function renderChecklistTracker(session) {
    const trackerEl = document.getElementById('candidate-tracker-list');
    const badgeEl = document.getElementById('tracker-completion-badge');
    if (!trackerEl) return;

    const savedState = getSavedChecklists();

    // Determine relevant exam keys from candidate session
    let candidateExams = (session && Array.isArray(session.targetExams) && session.targetExams.length > 0)
      ? session.targetExams.map(k => k.toLowerCase())
      : ['opsc', 'ossc'];

    // Filter to keys present in SYLLABUS_CHECKLISTS, fallback to opsc & ossc
    const validKeys = Object.keys(SYLLABUS_CHECKLISTS).filter(k => candidateExams.includes(k));
    const availableKeys = validKeys.length > 0 ? validKeys : ['opsc', 'ossc'];

    if (!availableKeys.includes(activeChecklistTab)) {
      activeChecklistTab = availableKeys[0];
    }

    const currentSyllabus = SYLLABUS_CHECKLISTS[activeChecklistTab] || SYLLABUS_CHECKLISTS.opsc;
    const examSaved = savedState[activeChecklistTab] || {};

    // Calculate completion percentage for the active exam syllabus
    let totalTopics = 0;
    let completedTopics = 0;

    currentSyllabus.stages.forEach(stage => {
      const stageSaved = examSaved[stage.id] || {};
      stage.topics.forEach(t => {
        totalTopics++;
        if (stageSaved[t.id]) completedTopics++;
      });
    });

    const percent = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;
    if (badgeEl) {
      badgeEl.textContent = `${percent}% Completed (${completedTopics}/${totalTopics})`;
      badgeEl.style.background = percent === 100 ? '#10b981' : (percent > 0 ? '#0d9488' : '#334155');
    }

    // Render Tab Selector
    const tabsHtml = `
      <div style="display:flex;align-items:center;gap:6px;overflow-x:auto;padding-bottom:8px;border-bottom:1px solid #1e293b;margin-bottom:12px;">
        ${availableKeys.map(key => {
          const syl = SYLLABUS_CHECKLISTS[key];
          const isActive = key === activeChecklistTab;
          return `
            <button type="button" class="btn-checklist-tab" data-exam-key="${key}" style="background:${isActive ? '#0d9488' : '#1e293b'};color:${isActive ? '#ffffff' : '#94a3b8'};border:1px solid ${isActive ? '#14b8a6' : '#334155'};border-radius:6px;padding:5px 10px;font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap;transition:all 0.15s;">
              ${syl.name.split(' ')[0]} ${key.toUpperCase()}
            </button>
          `;
        }).join('')}
      </div>
    `;

    // Render Progress Bar
    const progressBarHtml = `
      <div style="margin-bottom:14px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;font-size:11px;color:#94a3b8;">
          <span style="font-weight:600;color:#e2e8f0;">${currentSyllabus.name}</span>
          <span style="font-family:monospace;color:#2dd4bf;font-weight:700;">${percent}%</span>
        </div>
        <div style="width:100%;height:6px;background:#1e293b;border-radius:4px;overflow:hidden;">
          <div style="width:${percent}%;height:100%;background:linear-gradient(90deg, #0d9488, #2dd4bf);transition:width 0.3s ease;"></div>
        </div>
      </div>
    `;

    // Render Stage Accordions & Checkboxes
    const stagesHtml = currentSyllabus.stages.map((stage, idx) => {
      const stageSaved = examSaved[stage.id] || {};
      const stageDoneCount = stage.topics.filter(t => stageSaved[t.id]).length;
      const isAllStageDone = stageDoneCount === stage.topics.length;

      const topicsHtml = stage.topics.map(t => {
        const isDone = !!stageSaved[t.id];
        return `
          <label style="display:flex;align-items:flex-start;gap:10px;padding:7px 10px;border-radius:6px;background:${isDone ? 'rgba(13,148,136,0.1)' : 'rgba(15,23,42,0.4)'};border:1px solid ${isDone ? 'rgba(13,148,136,0.3)' : '#1e293b'};cursor:pointer;transition:all 0.15s;">
            <input type="checkbox" class="checklist-topic-cb" data-exam="${activeChecklistTab}" data-stage="${stage.id}" data-topic="${t.id}" ${isDone ? 'checked' : ''} style="margin-top:2px;width:15px;height:15px;accent-color:#0d9488;cursor:pointer;flex-shrink:0;" />
            <span style="font-size:12px;font-weight:500;color:${isDone ? '#cbd5e1' : '#94a3b8'};text-decoration:${isDone ? 'line-through' : 'none'};line-height:1.4;">${t.label}</span>
          </label>
        `;
      }).join('');

      return `
        <details ${idx === 0 || !isAllStageDone ? 'open' : ''} style="margin-bottom:10px;border:1px solid #1e293b;border-radius:8px;background:rgba(15,23,42,0.6);overflow:hidden;">
          <summary style="padding:10px 12px;font-size:12px;font-weight:700;color:#f8fafc;cursor:pointer;background:#1e293b;display:flex;align-items:center;justify-content:space-between;user-select:none;">
            <span>${stage.title}</span>
            <span style="font-size:10px;padding:2px 6px;border-radius:4px;background:${isAllStageDone ? '#10b981' : '#334155'};color:#ffffff;font-family:monospace;">${stageDoneCount}/${stage.topics.length}</span>
          </summary>
          <div style="padding:10px;display:flex;flex-direction:column;gap:6px;">
            ${topicsHtml}
          </div>
        </details>
      `;
    }).join('');

    trackerEl.innerHTML = tabsHtml + progressBarHtml + stagesHtml;

    // Attach Tab Event Listeners
    trackerEl.querySelectorAll('.btn-checklist-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        activeChecklistTab = btn.dataset.examKey;
        renderChecklistTracker(session);
      });
    });

    // Attach Topic Checkbox Listeners
    trackerEl.querySelectorAll('.checklist-topic-cb').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const examKey = e.target.dataset.exam;
        const stageId = e.target.dataset.stage;
        const topicId = e.target.dataset.topic;
        const isChecked = e.target.checked;

        const allChecklists = getSavedChecklists();
        if (!allChecklists[examKey]) allChecklists[examKey] = {};
        if (!allChecklists[examKey][stageId]) allChecklists[examKey][stageId] = {};

        allChecklists[examKey][stageId][topicId] = isChecked;
        saveChecklists(allChecklists);

        // Re-render to update percentages & progress
        renderChecklistTracker(session);
      });
    });
  }

  // Bookmarked Jobs Shelf
  function renderJobsShelf() {
    const listEl = document.getElementById('candidate-jobs-shelf');
    if (!listEl) return;

    let bookmarkedJobs = [];
    if (window.CSOBookmarks && typeof window.CSOBookmarks.getBookmarksByType === 'function') {
      bookmarkedJobs = window.CSOBookmarks.getBookmarksByType('jobs');
    }

    if (bookmarkedJobs.length === 0) {
      listEl.innerHTML = `
        <div style="padding:14px;border-radius:8px;background:rgba(15,23,42,0.4);border:1px dashed #334155;text-align:center;">
          <p style="font-size:12px;color:#94a3b8;margin:0 0 6px;">No jobs bookmarked yet.</p>
          <a href="/jobs-careers/" style="font-size:11px;color:#2dd4bf;text-decoration:none;font-weight:600;">Browse Jobs Directory to save posts →</a>
        </div>
      `;
      return;
    }

    listEl.innerHTML = bookmarkedJobs.map(job => `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 12px;border-radius:10px;background:rgba(15,23,42,0.6);border:1px solid #1e293b;">
        <div style="min-width:0;">
          <h4 style="font-size:12px;font-weight:700;color:#f8fafc;margin:0;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${job.title}</h4>
          <p style="font-size:10px;color:#94a3b8;margin:3px 0 0;"><span style="color:#2dd4bf;font-weight:600;">${job.badge || 'Jobs'}</span> • Saved: ${new Date(job.savedAt || Date.now()).toLocaleDateString()}</p>
        </div>
        <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
          <a href="${job.url || '/jobs-careers/'}" style="padding:4px 8px;border-radius:6px;background:rgba(13,148,136,0.15);border:1px solid rgba(13,148,136,0.3);color:#2dd4bf;font-size:11px;font-weight:600;text-decoration:none;">View</a>
          <button type="button" class="btn-remove-bm" data-type="jobs" data-id="${job.id}" title="Remove bookmark" style="background:transparent;border:1px solid #475569;border-radius:6px;padding:3px 6px;color:#94a3b8;font-size:11px;cursor:pointer;">✕</button>
        </div>
      </div>
    `).join('');

    listEl.querySelectorAll('.btn-remove-bm').forEach(btn => {
      btn.addEventListener('click', () => {
        if (window.CSOBookmarks) {
          window.CSOBookmarks.removeBookmark(btn.dataset.type, btn.dataset.id);
        }
      });
    });
  }

  // Saved PYQs & Study Material Shelf
  function renderStudyShelf() {
    const shelfEl = document.getElementById('candidate-pyq-shelf');
    if (!shelfEl) return;

    let bookmarkedStudy = [];
    if (window.CSOBookmarks && typeof window.CSOBookmarks.getBookmarksByType === 'function') {
      bookmarkedStudy = window.CSOBookmarks.getBookmarksByType('study');
    }

    const defaultItems = [
      { id: "def-pyq-1", title: "OPSC OCS General Studies Paper I — 5 Year PYQ Compilation", size: "3.4 MB", ext: "PDF", link: "/assets/pdf/opsc-ocs-gs1-pyq.pdf", badge: "Official Mirror" },
      { id: "def-pyq-2", title: "OSSC CGL Arithmetic & Reasoning Topic-Wise Question Bank", size: "2.1 MB", ext: "PDF", link: "/assets/pdf/ossc-cgl-maths-bank.pdf", badge: "Cloudflare R2" },
      { id: "def-pyq-3", title: "Odisha History, Art & Culture Complete Reference Compendium", size: "5.8 MB", ext: "PDF", link: "/assets/pdf/odisha-history-culture.pdf", badge: "Study Vault" },
      { id: "def-pyq-4", title: "Odisha Teacher Eligibility Test (OTET) Pedagogy Notes (Odia)", size: "1.9 MB", ext: "PDF", link: "/assets/pdf/otet-pedagogy-notes.pdf", badge: "Odia Script" }
    ];

    let html = '';

    if (bookmarkedStudy.length > 0) {
      html += `<div style="font-size:11px;font-weight:700;color:#f59e0b;margin-bottom:6px;">★ Saved by Candidate (${bookmarkedStudy.length}):</div>`;
      html += bookmarkedStudy.map(item => `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 12px;border-radius:10px;background:rgba(15,23,42,0.6);border:1px solid #1e293b;margin-bottom:8px;">
          <div style="display:flex;align-items:center;gap:10px;min-width:0;">
            <span style="width:30px;height:30px;border-radius:8px;background:rgba(245,158,11,0.15);color:#f59e0b;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;">DOC</span>
            <div style="min-width:0;">
              <h4 style="font-size:12px;font-weight:600;color:#f8fafc;margin:0;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${item.title}</h4>
              <span style="font-size:10px;color:#94a3b8;font-family:monospace;"><span style="color:#f59e0b;">${item.badge || 'Study Library'}</span> • Saved</span>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
            <a href="${item.url || '/study-library/'}" style="padding:4px 8px;border-radius:6px;background:rgba(13,148,136,0.15);border:1px solid rgba(13,148,136,0.3);color:#2dd4bf;font-size:11px;font-weight:600;text-decoration:none;">View</a>
            <button type="button" class="btn-remove-bm" data-type="study" data-id="${item.id}" title="Remove bookmark" style="background:transparent;border:1px solid #475569;border-radius:6px;padding:3px 6px;color:#94a3b8;font-size:11px;cursor:pointer;">✕</button>
          </div>
        </div>
      `).join('');
      html += `<div style="font-size:11px;font-weight:700;color:#94a3b8;margin:12px 0 6px;">Curated Official Downloads:</div>`;
    }

    html += defaultItems.map(item => `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 12px;border-radius:10px;background:rgba(15,23,42,0.6);border:1px solid #1e293b;margin-bottom:8px;">
        <div style="display:flex;align-items:center;gap:10px;min-width:0;">
          <span style="width:32px;height:32px;border-radius:8px;background:rgba(239,68,68,0.15);color:#f87171;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;">${item.ext}</span>
          <div style="min-width:0;">
            <h4 style="font-size:12px;font-weight:600;color:#f8fafc;margin:0;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${item.title}</h4>
            <span style="font-size:10px;color:#94a3b8;font-family:monospace;">${item.size} • <span style="color:#2dd4bf;">${item.badge}</span></span>
          </div>
        </div>
        <a href="${item.link}" target="_blank" rel="noopener noreferrer" style="flex-shrink:0;padding:5px 10px;border-radius:6px;background:#1e293b;border:1px solid #334155;color:#e2e8f0;font-size:11px;font-weight:600;text-decoration:none;display:inline-flex;align-items:center;gap:4px;">
          <span>Download</span> ⬇
        </a>
      </div>
    `).join('');

    shelfEl.innerHTML = html;

    shelfEl.querySelectorAll('.btn-remove-bm').forEach(btn => {
      btn.addEventListener('click', () => {
        if (window.CSOBookmarks) {
          window.CSOBookmarks.removeBookmark(btn.dataset.type, btn.dataset.id);
        }
      });
    });
  }

  // Eligible Scholarships & Welfare Schemes
  function renderSchemes() {
    const listEl = document.getElementById('candidate-schemes-list');
    if (!listEl) return;

    let bookmarkedSchemes = [];
    if (window.CSOBookmarks && typeof window.CSOBookmarks.getBookmarksByType === 'function') {
      bookmarkedSchemes = window.CSOBookmarks.getBookmarksByType('schemes');
    }

    const defaultSchemes = [
      {
        id: "def-sch-1",
        title: "Subhadra Yojana — Direct Financial Assistance",
        titleOdia: "ସୁଭଦ୍ରା ଯୋଜନା",
        amount: "₹10,000 / Year",
        target: "Women (Aged 21-60)",
        link: "/schemes-benefits/"
      },
      {
        id: "def-sch-2",
        title: "e-Medhabruti Higher Education Scholarship",
        titleOdia: "ଇ-ମେଧାବୃତ୍ତି ସ୍କଲାରସିପ୍",
        amount: "Up to ₹10,000 / Year",
        target: "Undergraduate & PG Students",
        link: "/schemes-benefits/"
      },
      {
        id: "def-sch-3",
        title: "KALIA Scholarship for Professional Education",
        titleOdia: "କାଳିଆ ଛାତ୍ରବୃତ୍ତି",
        amount: "Full Course Fee Waiver",
        target: "Children of Farmers (MBBS/B.Tech)",
        link: "/schemes-benefits/"
      }
    ];

    let html = '';

    if (bookmarkedSchemes.length > 0) {
      html += `<div style="font-size:11px;font-weight:700;color:#f59e0b;margin-bottom:6px;">★ Saved Schemes (${bookmarkedSchemes.length}):</div>`;
      html += bookmarkedSchemes.map(sc => `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 12px;border-radius:10px;background:rgba(15,23,42,0.6);border:1px solid #1e293b;margin-bottom:8px;">
          <div style="min-width:0;">
            <h4 style="font-size:12px;font-weight:700;color:#f8fafc;margin:0;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${sc.title}</h4>
            <p style="font-size:10px;color:#94a3b8;margin:2px 0 0;"><span style="color:#f59e0b;">${sc.badge || 'Saved Scheme'}</span></p>
          </div>
          <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
            <a href="${sc.url || '/schemes-benefits/'}" style="padding:4px 8px;border-radius:6px;background:rgba(13,148,136,0.15);border:1px solid rgba(13,148,136,0.3);color:#2dd4bf;font-size:11px;font-weight:600;text-decoration:none;">Details →</a>
            <button type="button" class="btn-remove-bm" data-type="schemes" data-id="${sc.id}" title="Remove bookmark" style="background:transparent;border:1px solid #475569;border-radius:6px;padding:3px 6px;color:#94a3b8;font-size:11px;cursor:pointer;">✕</button>
          </div>
        </div>
      `).join('');
      html += `<div style="font-size:11px;font-weight:700;color:#94a3b8;margin:12px 0 6px;">Featured State Programs:</div>`;
    }

    html += defaultSchemes.map(sc => `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 12px;border-radius:10px;background:rgba(15,23,42,0.6);border:1px solid #1e293b;margin-bottom:8px;">
        <div>
          <h4 style="font-size:12px;font-weight:700;color:#f8fafc;margin:0;">${sc.title}</h4>
          <p style="font-size:10px;color:#94a3b8;margin:2px 0 0;">${sc.titleOdia} • <strong style="color:#34d399;">${sc.amount}</strong> (${sc.target})</p>
        </div>
        <a href="${sc.link}" style="flex-shrink:0;padding:5px 10px;border-radius:6px;background:rgba(13,148,136,0.15);border:1px solid rgba(13,148,136,0.3);color:#2dd4bf;font-size:11px;font-weight:600;text-decoration:none;">
          Check Eligibility →
        </a>
      </div>
    `).join('');

    listEl.innerHTML = html;

    listEl.querySelectorAll('.btn-remove-bm').forEach(btn => {
      btn.addEventListener('click', () => {
        if (window.CSOBookmarks) {
          window.CSOBookmarks.removeBookmark(btn.dataset.type, btn.dataset.id);
        }
      });
    });
  }

  function init() {
    const session = getSession();
    renderHero(session);
    renderMilestones(session);
    renderChecklistTracker(session);
    renderJobsShelf();
    renderStudyShelf();
    renderSchemes();

    // Listen for bookmark updates
    window.addEventListener('cso:bookmarks-updated', () => {
      renderJobsShelf();
      renderStudyShelf();
      renderSchemes();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window);
