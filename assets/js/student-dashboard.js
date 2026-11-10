/**
 * Common Sense Odisha (CSO) — Student Dashboard Portal Logic (Independent Candidate Workspace Edition)
 * Features:
 * - Dynamic Candidate Topbar Profile with real registered name from cso_candidate_session_v1
 * - Direct [🚪 Logout] Action with session clearing, toast notification & clean redirect
 * - Self-contained In-Dashboard SPA Tools:
 *     - Multi-Stage Syllabus Checklists (cso_candidate_checklist_v1)
 *     - Private Library & Bookmarks (cso_candidate_bookmarks_v1)
 *     - Revision Scratchpad & Daily Notes (cso_candidate_notes_v1)
 *     - Mock Test Score Logger (cso_candidate_mock_scores_v1)
 *     - Exam Calendar & Countdown Timeline
 *     - Candidate KYC & Document Locker Checklist (cso_candidate_locker_v1)
 * - Isolated from public website: No routing back to general public tables or external prompts
 */
(function(window) {
  'use strict';

  const SESSION_KEY = 'cso_candidate_session_v1';
  const CHECKLIST_KEY = 'cso_candidate_checklist_v1';
  const VAULT_KEY = 'cso_registered_accounts_v1';
  const NOTES_KEY = 'cso_candidate_notes_v1';
  const SCORES_KEY = 'cso_candidate_mock_scores_v1';
  const LOCKER_KEY = 'cso_candidate_locker_v1';

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
      short: "OPSC OCS",
      cardClass: "card-cobalt",
      badge: "OPSC • Class I & II",
      accentColor: "#38bdf8",
      stages: [
        {
          id: "opsc-prelims",
          title: "Stage I: Preliminary Examination (Objective)",
          topics: [
            { id: "opsc-p-gs1-hist", label: "History of India & Indian National Movement (Odisha Emphasis)", time: "45 min", badge: "Prelims GS-1" },
            { id: "opsc-p-gs1-geo", label: "Indian & Odisha Physical, Social, Economic Geography", time: "30 min", badge: "Geography" },
            { id: "opsc-p-gs1-pol", label: "Indian Polity & Governance, Odisha Panchayati Raj, Public Policy", time: "40 min", badge: "Polity" },
            { id: "opsc-p-gs1-eco", label: "Economic & Social Development, Sustainable Development Goals", time: "35 min", badge: "Economy" },
            { id: "opsc-p-gs1-env", label: "General Issues on Ecology, Biodiversity, Odisha Wildlife Sanctuaries", time: "25 min", badge: "Ecology" },
            { id: "opsc-p-gs1-sci", label: "General Science & Emerging Science & Tech Innovations", time: "30 min", badge: "Science" },
            { id: "opsc-p-gs2-csat", label: "Paper-II (CSAT): Comprehension, Interpersonal Skills & Communication", time: "50 min", badge: "CSAT" },
            { id: "opsc-p-gs2-quant", label: "Paper-II (CSAT): Logical Reasoning, Basic Numeracy (Class X standard)", time: "60 min", badge: "CSAT" }
          ]
        },
        {
          id: "opsc-mains",
          title: "Stage II: Main Written Examination (Descriptive)",
          topics: [
            { id: "opsc-m-odia", label: "Paper I: Odia Language Qualifying (Essay, Translation, Grammar)", time: "60 min", badge: "Mains" },
            { id: "opsc-m-eng", label: "Paper II: English Qualifying (Precis, Comprehension, Usage)", time: "60 min", badge: "Mains" },
            { id: "opsc-m-essay", label: "Paper III: English Essay Writing (Socio-Economic & Philosophical)", time: "90 min", badge: "Essay" },
            { id: "opsc-m-gs1", label: "Paper IV: General Studies I (Indian Heritage, Culture & Odisha Heritage)", time: "60 min", badge: "GS-1" },
            { id: "opsc-m-gs2", label: "Paper V: General Studies II (Governance, Constitution, Polity & IR)", time: "60 min", badge: "GS-2" },
            { id: "opsc-m-gs3", label: "Paper VI: General Studies III (Technology, Economic Development, Disaster)", time: "60 min", badge: "GS-3" },
            { id: "opsc-m-gs4", label: "Paper VII: General Studies IV (Ethics, Integrity & Case Studies)", time: "60 min", badge: "GS-4" },
            { id: "opsc-m-opt1", label: "Paper VIII & IX: Optional Subject Paper I & II Revision", time: "120 min", badge: "Optional" }
          ]
        },
        {
          id: "opsc-viva",
          title: "Stage III: Personality Test & Interview",
          topics: [
            { id: "opsc-v-daf", label: "Detailed Application Form (DAF) Background & Hobby Revision", time: "45 min", badge: "Interview" },
            { id: "opsc-v-dist", label: "Home District Socio-Economic Profile & Local Issues Preparation", time: "45 min", badge: "Interview" },
            { id: "opsc-v-mock", label: "2+ Board Mock Interviews & Confidence Building Drills", time: "60 min", badge: "Interview" }
          ]
        }
      ]
    },
    ossc: {
      name: "OSSC Combined Graduate Level (CGL) & CHSL",
      short: "OSSC CGL",
      cardClass: "card-coral",
      badge: "OSSC • Group-B / C",
      accentColor: "#fdba74",
      stages: [
        {
          id: "ossc-stage1",
          title: "Stage I: Preliminary Examination (CBRE / OMR)",
          topics: [
            { id: "ossc-p-arith", label: "Arithmetic & Advanced Mathematics (10th/12th Standard Speed Drills)", time: "45 min", badge: "Maths" },
            { id: "ossc-p-di", label: "Data Interpretation (Charts, Graphs, Tables & Data Sufficiency)", time: "30 min", badge: "DI" },
            { id: "ossc-p-reason", label: "Logical Reasoning, Analytical Ability & Mental Agility", time: "40 min", badge: "Reasoning" },
            { id: "ossc-p-current", label: "Current Events of National & International Importance", time: "25 min", badge: "Current Affairs" },
            { id: "ossc-p-comp", label: "Computer & Internet Awareness (MS Office, OS, Networking)", time: "30 min", badge: "Computer" }
          ]
        },
        {
          id: "ossc-stage2",
          title: "Stage II: Main Written Examination",
          topics: [
            { id: "ossc-m-odia", label: "Odia Language Competency (Grammar, Vocabulary & Comprehension)", time: "45 min", badge: "Language" },
            { id: "ossc-m-eng", label: "English Language Competency (Sentence Correction, Idioms, Vocab)", time: "45 min", badge: "Language" },
            { id: "ossc-m-gs", label: "General Studies (Odisha History, Geography, Environment & Polity)", time: "60 min", badge: "GS" }
          ]
        },
        {
          id: "ossc-skill",
          title: "Stage III: Computer Skill Test & Certificate Verification",
          topics: [
            { id: "ossc-s-word", label: "MS Word Document Formatting & Tabular Structure Drills", time: "30 min", badge: "Practical" },
            { id: "ossc-s-excel", label: "MS Excel Formulas, Functions, Pivot Tables & Data Sorting", time: "30 min", badge: "Practical" },
            { id: "ossc-s-ppt", label: "MS PowerPoint Slide Preparation with Formatting Requirements", time: "30 min", badge: "Practical" }
          ]
        }
      ]
    },
    teaching: {
      name: "Odisha B.Ed Entrance & Teacher Eligibility (OTET / OSSTET)",
      short: "Odisha B.Ed",
      cardClass: "card-charcoal",
      badge: "SAMS • Education",
      accentColor: "#94a3b8",
      stages: [
        {
          id: "bed-paper1",
          title: "Paper I: General Section (Compulsory for All Streams)",
          topics: [
            { id: "bed-p1-eng", label: "General English Comprehension, Vocabulary & Sentence Structure", time: "35 min", badge: "English" },
            { id: "bed-p1-odia", label: "Odia Grammar, Dhwani, Barna, Sabdaprakarana & Bakyabibhaga", time: "35 min", badge: "Odia" },
            { id: "bed-p1-gk", label: "General Awareness, NEP 2020 & Odisha Education Policy Initiatives", time: "30 min", badge: "GK & NEP" },
            { id: "bed-p1-reason", label: "Reasoning Ability & Analytical Judgment", time: "30 min", badge: "Reasoning" },
            { id: "bed-p1-aptitude", label: "Teaching Aptitude, Classroom Management & Child Psychology", time: "45 min", badge: "Pedagogy" }
          ]
        },
        {
          id: "bed-paper2-arts",
          title: "Paper II (Arts Stream): Subject Specialization",
          topics: [
            { id: "bed-p2-hist", label: "History & Political Science (Indian Freedom Movement, Constitution)", time: "40 min", badge: "Arts" },
            { id: "bed-p2-geo", label: "Geography & Economics (Physical Geography, Natural Resources)", time: "40 min", badge: "Arts" },
            { id: "bed-p2-eng-odia", label: "English & Odia Language Literature Concepts", time: "40 min", badge: "Arts" }
          ]
        },
        {
          id: "bed-paper2-sci",
          title: "Paper II (Science Stream): Subject Specialization",
          topics: [
            { id: "bed-p2-phy-chem", label: "Physical Science (Atomic Structure, Chemical Reactions, Motion)", time: "45 min", badge: "Science" },
            { id: "bed-p2-bio", label: "Biological Science (Cell Biology, Plant/Animal Nutrition, Genetics)", time: "45 min", badge: "Science" },
            { id: "bed-p2-math", label: "Mathematics (Number System, Algebra, Geometry & Trigonometry)", time: "45 min", badge: "Science" }
          ]
        }
      ]
    },
    police: {
      name: "Odisha Police Recruitment (Sub-Inspector & Constable)",
      short: "Police SI",
      cardClass: "card-charcoal",
      badge: "Police Recruitment",
      accentColor: "#a3e635",
      stages: [
        {
          id: "police-cbre",
          title: "Written Examination (Computer Based Recruitment)",
          topics: [
            { id: "pol-p1-odia", label: "Paper I: Odia Language Comprehension & Descriptive Translation", time: "40 min", badge: "Paper-1" },
            { id: "pol-p1-eng", label: "Paper I: English Language Composition, Precis & Correct Usage", time: "40 min", badge: "Paper-1" },
            { id: "pol-p2-gs", label: "Paper II: General Studies, Current Affairs & National Security", time: "50 min", badge: "Paper-2" },
            { id: "pol-p2-quant", label: "Paper II: Quantitative Aptitude & Mental Ability", time: "45 min", badge: "Paper-2" },
            { id: "pol-p2-computer", label: "Paper II: Basic Computer Fundamentals & Cyber Awareness", time: "30 min", badge: "Paper-2" }
          ]
        },
        {
          id: "police-pmt-pet",
          title: "Physical Measurement & Physical Efficiency Test (PET/PMT)",
          topics: [
            { id: "pol-pet-run", label: "1.6 KM Running Practice (Target Time: < 6.5 Minutes)", time: "30 min", badge: "Fitness" },
            { id: "pol-pet-jump", label: "Broad Jump (Long Jump Qualification Target: 3.66 Meters)", time: "20 min", badge: "Fitness" },
            { id: "pol-pmt-measure", label: "Height & Chest Standard Verification Check", time: "15 min", badge: "Standards" }
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

  function getMockScores() {
    try {
      const raw = localStorage.getItem(SCORES_KEY);
      if (raw) return JSON.parse(raw);
    } catch(e) {}
    return [
      { id: "mock-1", date: "2026-11-04", exam: "OPSC OCS Prelims", paper: "General Studies Paper I", score: 142, max: 200, accuracy: "71%" },
      { id: "mock-2", date: "2026-11-07", exam: "OSSC CGL CBRE", paper: "Arithmetic & Reasoning Speed Test", score: 118, max: 150, accuracy: "78.6%" },
      { id: "mock-3", date: "2026-11-09", exam: "Odisha B.Ed Entrance", paper: "Teaching Aptitude & General English", score: 68, max: 80, accuracy: "85%" }
    ];
  }

  function saveMockScores(list) {
    try {
      localStorage.setItem(SCORES_KEY, JSON.stringify(list));
    } catch(e) {}
  }

  // Toast Notification
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
      padding:10px 18px;border-radius:10px;font-size:13px;font-weight:600;color:#ffffff;
      background:${type === 'success' ? '#0d9488' : '#ef4444'};
      box-shadow:0 8px 24px rgba(0,0,0,0.4);display:flex;align-items:center;gap:8px;
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

  // Topbar and Sidebar User Info & Logout
  function renderUserProfile(session) {
    const candidateName = (session?.fullName || session?.name || 'RAMESH BISWAL').toUpperCase();
    const candidateDistrict = session?.district || 'Balasore (Baleswar)';
    const initial = candidateName.charAt(0);

    // Topbar Profile Pill
    const topAvatar = document.getElementById('bp-top-avatar');
    const topName = document.getElementById('bp-top-name');
    const topDistrict = document.getElementById('bp-top-district');
    if (topAvatar) topAvatar.textContent = initial;
    if (topName) topName.textContent = candidateName;
    if (topDistrict) topDistrict.textContent = candidateDistrict;

    // Sidebar Footer Profile Badge
    const sideAvatar = document.getElementById('bp-side-avatar');
    const sideName = document.getElementById('bp-side-name');
    const sideDistrict = document.getElementById('bp-side-district');
    if (sideAvatar) sideAvatar.textContent = initial;
    if (sideName) sideName.textContent = candidateName;
    if (sideDistrict) sideDistrict.textContent = candidateDistrict;

    // Profile & Settings Tab
    const tabSettingsName = document.getElementById('tab-settings-name');
    const tabSettingsDistrict = document.getElementById('tab-settings-district');
    if (tabSettingsName) tabSettingsName.textContent = candidateName;
    if (tabSettingsDistrict) tabSettingsDistrict.textContent = candidateDistrict;
  }

  // Handle Logout
  function handleCandidateLogout() {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch(e) {}

    showToast('Logged out successfully.');

    // Redirect to home or trigger clean state
    setTimeout(() => {
      window.location.href = '/';
    }, 600);
  }

  // Calculate Progress Stats for an Exam
  function getExamProgress(examKey) {
    const syllabus = SYLLABUS_CHECKLISTS[examKey];
    if (!syllabus) return { total: 0, completed: 0, percent: 0 };

    const saved = getSavedChecklists();
    const examSaved = saved[examKey] || {};

    let total = 0;
    let completed = 0;

    syllabus.stages.forEach(stage => {
      const stageSaved = examSaved[stage.id] || {};
      stage.topics.forEach(t => {
        total++;
        if (stageSaved[t.id]) completed++;
      });
    });

    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percent };
  }

  // Update Exam Cards on Dashboard
  function updateExamCards() {
    // 1. OPSC OCS
    const opscStats = getExamProgress('opsc');
    const opscPctLabel = document.getElementById('card-opsc-pct-label');
    const opscCountLabel = document.getElementById('card-opsc-count-label');
    const opscBar = document.getElementById('card-opsc-bar');
    if (opscPctLabel) opscPctLabel.textContent = `${opscStats.percent}% Completed`;
    if (opscCountLabel) opscCountLabel.textContent = `${opscStats.completed}/${opscStats.total} Topics`;
    if (opscBar) opscBar.style.width = `${opscStats.percent}%`;

    // 2. OSSC CGL
    const osscStats = getExamProgress('ossc');
    const osscPctLabel = document.getElementById('card-ossc-pct-label');
    const osscCountLabel = document.getElementById('card-ossc-count-label');
    const osscBar = document.getElementById('card-ossc-bar');
    if (osscPctLabel) osscPctLabel.textContent = `${osscStats.percent}% Completed`;
    if (osscCountLabel) osscCountLabel.textContent = `${osscStats.completed}/${osscStats.total} Topics`;
    if (osscBar) osscBar.style.width = `${osscStats.percent}%`;

    // 3. Teaching / Police
    const teachStats = getExamProgress('teaching');
    const teachPctLabel = document.getElementById('card-teach-pct-label');
    const teachCountLabel = document.getElementById('card-teach-count-label');
    const teachBar = document.getElementById('card-teach-bar');
    if (teachPctLabel) teachPctLabel.textContent = `${teachStats.percent}% Completed`;
    if (teachCountLabel) teachCountLabel.textContent = `${teachStats.completed}/${teachStats.total} Topics`;
    if (teachBar) teachBar.style.width = `${teachStats.percent}%`;
  }

  // Render Upcoming Lessons & Targets
  function renderUpcomingLessons() {
    const listEl = document.getElementById('bp-upcoming-lessons-list');
    if (!listEl) return;

    const saved = getSavedChecklists();

    const targetItems = [
      { exam: "opsc", stageId: "opsc-prelims", topicId: "opsc-p-gs1-hist", title: "History of India & National Movement (Odisha Special)", stream: "OPSC OCS", time: "45 min" },
      { exam: "opsc", stageId: "opsc-prelims", topicId: "opsc-p-gs1-geo", title: "Odisha Physical & Economic Geography Compendium", stream: "OPSC OCS", time: "30 min" },
      { exam: "ossc", stageId: "ossc-stage1", topicId: "ossc-p-arith", title: "Arithmetic & Data Interpretation Speed Drills (Class X)", stream: "OSSC CGL", time: "45 min" },
      { exam: "teaching", stageId: "bed-paper1", topicId: "bed-p1-aptitude", title: "Teaching Aptitude, Classroom Management & Child Psychology", stream: "Odisha B.Ed", time: "40 min" },
      { exam: "ossc", stageId: "ossc-stage1", topicId: "ossc-p-comp", title: "Computer & Internet Awareness (MS Office & Cybersecurity)", stream: "OSSC CGL", time: "30 min" },
      { exam: "opsc", stageId: "opsc-prelims", topicId: "opsc-p-gs2-csat", title: "Paper-II (CSAT): Comprehension & Reasoning Tests", stream: "OPSC OCS", time: "50 min" }
    ];

    listEl.innerHTML = targetItems.map(item => {
      const isDone = !!(saved[item.exam] && saved[item.exam][item.stageId] && saved[item.exam][item.stageId][item.topicId]);
      return `
        <div class="bp-lesson-item ${isDone ? 'completed' : ''}" data-exam="${item.exam}" data-stage="${item.stageId}" data-topic="${item.topicId}">
          <div class="bp-lesson-left">
            <input type="checkbox" class="bp-lesson-cb" ${isDone ? 'checked' : ''} aria-label="Mark completed" />
            <div>
              <h4 class="bp-lesson-title">${item.title}</h4>
              <div class="bp-lesson-meta">
                <span class="bp-badge-stream">${item.stream}</span>
                <span>• Scheduled Target</span>
              </div>
            </div>
          </div>
          <div class="bp-lesson-right">
            <span class="bp-lesson-time">⏱️ ${item.time}</span>
            <button type="button" class="bp-lesson-play-btn" title="Open syllabus details">▶</button>
          </div>
        </div>
      `;
    }).join('');

    // Attach Checkbox Handlers
    listEl.querySelectorAll('.bp-lesson-cb').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const itemEl = e.target.closest('.bp-lesson-item');
        if (!itemEl) return;
        const exam = itemEl.dataset.exam;
        const stage = itemEl.dataset.stage;
        const topic = itemEl.dataset.topic;
        const isChecked = e.target.checked;

        const allChecklists = getSavedChecklists();
        if (!allChecklists[exam]) allChecklists[exam] = {};
        if (!allChecklists[exam][stage]) allChecklists[exam][stage] = {};
        allChecklists[exam][stage][topic] = isChecked;
        saveChecklists(allChecklists);

        if (isChecked) {
          itemEl.classList.add('completed');
          showToast('Lesson milestone marked as completed!');
        } else {
          itemEl.classList.remove('completed');
        }

        updateExamCards();
        renderChecklistTracker();
        if (window.CSOSync && typeof window.CSOSync.pushLocalStateToCloud === 'function') {
          window.CSOSync.pushLocalStateToCloud();
        }
      });
    });

    listEl.querySelectorAll('.bp-lesson-play-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        switchTab('tab-my-learning');
      });
    });
  }

  // Multi-Stage Syllabus Checklist (for Tab My Learning)
  let activeChecklistExam = 'opsc';

  function renderChecklistTracker() {
    const trackerEl = document.getElementById('candidate-tracker-list');
    const badgeEl = document.getElementById('tracker-completion-badge');
    if (!trackerEl) return;

    const savedState = getSavedChecklists();
    const currentSyllabus = SYLLABUS_CHECKLISTS[activeChecklistExam] || SYLLABUS_CHECKLISTS.opsc;
    const examSaved = savedState[activeChecklistExam] || {};

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
    }

    const examKeys = Object.keys(SYLLABUS_CHECKLISTS);
    const tabsHtml = `
      <div style="display:flex;align-items:center;gap:6px;overflow-x:auto;padding-bottom:10px;margin-bottom:14px;border-bottom:1px solid rgba(255,255,255,0.08);">
        ${examKeys.map(key => {
          const syl = SYLLABUS_CHECKLISTS[key];
          const isActive = key === activeChecklistExam;
          return `
            <button type="button" class="bp-chip ${isActive ? 'active' : ''}" data-checklist-exam="${key}">
              ${syl.short || key.toUpperCase()}
            </button>
          `;
        }).join('')}
      </div>
    `;

    const stagesHtml = currentSyllabus.stages.map((stage, idx) => {
      const stageSaved = examSaved[stage.id] || {};
      const stageDoneCount = stage.topics.filter(t => stageSaved[t.id]).length;

      const topicsHtml = stage.topics.map(t => {
        const isDone = !!stageSaved[t.id];
        return `
          <label style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-radius:8px;background:${isDone ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.02)'};border:1px solid ${isDone ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)'};cursor:pointer;margin-bottom:6px;">
            <div style="display:flex;align-items:center;gap:12px;">
              <input type="checkbox" class="cb-stage-topic" data-exam="${activeChecklistExam}" data-stage="${stage.id}" data-topic="${t.id}" ${isDone ? 'checked' : ''} style="accent-color:#0d9488;width:17px;height:17px;" />
              <span style="font-size:13px;color:${isDone ? '#94a3b8' : '#f8fafc'};text-decoration:${isDone ? 'line-through' : 'none'};">${t.label}</span>
            </div>
            <span style="font-size:11px;color:#64748b;font-family:monospace;">${t.time || '30m'}</span>
          </label>
        `;
      }).join('');

      return `
        <details ${idx === 0 ? 'open' : ''} style="margin-bottom:12px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.08);border-radius:12px;overflow:hidden;">
          <summary style="padding:12px 16px;background:rgba(255,255,255,0.04);cursor:pointer;font-size:13px;font-weight:700;color:#f8fafc;display:flex;align-items:center;justify-content:space-between;">
            <span>${stage.title}</span>
            <span style="font-size:11px;padding:2px 8px;border-radius:12px;background:#1e293b;color:#2dd4bf;font-family:monospace;">${stageDoneCount}/${stage.topics.length}</span>
          </summary>
          <div style="padding:12px;">
            ${topicsHtml}
          </div>
        </details>
      `;
    }).join('');

    trackerEl.innerHTML = tabsHtml + stagesHtml;

    // Attach Tab Handlers
    trackerEl.querySelectorAll('button[data-checklist-exam]').forEach(btn => {
      btn.addEventListener('click', () => {
        activeChecklistExam = btn.dataset.checklistExam;
        renderChecklistTracker();
      });
    });

    // Attach Topic Checkboxes
    trackerEl.querySelectorAll('.cb-stage-topic').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const exam = e.target.dataset.exam;
        const stage = e.target.dataset.stage;
        const topic = e.target.dataset.topic;
        const isChecked = e.target.checked;

        const allChecklists = getSavedChecklists();
        if (!allChecklists[exam]) allChecklists[exam] = {};
        if (!allChecklists[exam][stage]) allChecklists[exam][stage] = {};
        allChecklists[exam][stage][topic] = isChecked;
        saveChecklists(allChecklists);

        updateExamCards();
        renderUpcomingLessons();
        renderChecklistTracker();
        if (window.CSOSync && typeof window.CSOSync.pushLocalStateToCloud === 'function') {
          window.CSOSync.pushLocalStateToCloud();
        }
      });
    });
  }

  // Active Exam Milestones & Countdown Timers
  function renderMilestones() {
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
        { id: "EV-01", title: "OPSC Odisha Civil Services (OCS) Prelims 2026", titleOdia: "ଓପିଏସସି ସିଭିଲ ସର୍ଭିସେସ ପ୍ରିଲିମ୍ସ", eventStartDate: "2026-11-29", eventType: "Exam", venueDistrict: "All 30 Districts" },
        { id: "EV-02", title: "OSSC Combined Graduate Level (CGL) Mains 2026", titleOdia: "ଓଏସଏସସି ସିଜିଏଲ ମୁଖ୍ୟ ପରୀକ୍ଷା", eventStartDate: "2026-12-14", eventType: "Exam", venueDistrict: "Bhubaneswar / Cuttack" },
        { id: "EV-03", title: "OSSSC RI & ARI Practical Skill Test Schedule", titleOdia: "ଆରଆଇ ଏବଂ ଏଆରଆଇ କମ୍ପ୍ୟୁଟର ପରୀକ୍ଷା", eventStartDate: "2026-12-22", eventType: "Skill Test", venueDistrict: "District HQs" },
        { id: "EV-04", title: "Odisha B.Ed Entrance Application Form Closing", titleOdia: "ବି.ଏଡ୍ ପ୍ରବେଶିକା ଆବେଦନ ଶେଷ ତାରିଖ", eventStartDate: "2026-12-05", eventType: "Deadline", venueDistrict: "Online State Portal" }
      ];
    }

    const now = new Date();
    listEl.innerHTML = allEvents.map(ev => {
      let daysLeft = 'Upcoming';
      let dateStr = ev.eventStartDate || '';
      if (dateStr) {
        const evDate = new Date(dateStr);
        const diffMs = evDate - now;
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays > 0) daysLeft = `${diffDays} days left`;
        else if (diffDays === 0) daysLeft = 'Today!';
        else daysLeft = 'Concluded';
      }

      return `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-radius:10px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.08);">
          <div>
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;">
              <span style="font-size:10px;padding:1px 6px;border-radius:4px;background:rgba(13,148,136,0.15);color:#2dd4bf;font-weight:700;">${ev.eventType || 'Event'}</span>
              <span style="font-size:10px;color:#94a3b8;font-family:monospace;">${ev.eventStartDate || 'TBA'}</span>
            </div>
            <h4 style="font-size:13px;font-weight:700;color:#f8fafc;margin:0;">${ev.title}</h4>
            <span style="font-size:11px;color:#64748b;">📍 ${ev.venueDistrict || 'Odisha'}</span>
          </div>
          <span style="padding:4px 10px;border-radius:8px;font-size:11px;font-weight:700;background:#1e293b;color:#38bdf8;font-family:monospace;">
            ${daysLeft}
          </span>
        </div>
      `;
    }).join('');
  }

  // Bookmarked Jobs Shelf (Candidate Isolated)
  function renderJobsShelf() {
    const listEl = document.getElementById('candidate-jobs-shelf');
    const tabListEl = document.getElementById('bookmarks-tab-jobs-shelf');
    if (!listEl) return;

    let bookmarkedJobs = [];
    if (window.CSOBookmarks && typeof window.CSOBookmarks.getBookmarksByType === 'function') {
      bookmarkedJobs = window.CSOBookmarks.getBookmarksByType('jobs');
    }

    if (bookmarkedJobs.length === 0) {
      const emptyHtml = `
        <div style="padding:16px;border-radius:10px;background:rgba(255,255,255,0.02);border:1px dashed rgba(255,255,255,0.12);text-align:center;">
          <p style="font-size:12px;color:#94a3b8;margin:0 0 4px;">You haven't bookmarked any opportunities yet.</p>
          <p style="font-size:11px;color:#64748b;margin:0;">Star any post or recruitment alert across your modules to pin it to your quick shelf.</p>
        </div>
      `;
      listEl.innerHTML = emptyHtml;
      if (tabListEl) tabListEl.innerHTML = emptyHtml;
      return;
    }

    const html = bookmarkedJobs.map(job => `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 14px;border-radius:10px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.08);">
        <div style="min-width:0;">
          <h4 style="font-size:12px;font-weight:700;color:#f8fafc;margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${job.title}</h4>
          <span style="font-size:10px;color:#2dd4bf;">${job.badge || 'Jobs'}</span>
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
          <button type="button" class="btn-remove-bm" data-type="jobs" data-id="${job.id}" style="background:transparent;border:1px solid rgba(255,255,255,0.12);border-radius:6px;padding:3px 8px;color:#f87171;font-size:11px;cursor:pointer;">Remove ✕</button>
        </div>
      </div>
    `).join('');

    listEl.innerHTML = html;
    if (tabListEl) tabListEl.innerHTML = html;

    document.querySelectorAll('.btn-remove-bm').forEach(btn => {
      btn.addEventListener('click', () => {
        if (window.CSOBookmarks) {
          window.CSOBookmarks.removeBookmark(btn.dataset.type, btn.dataset.id);
          renderJobsShelf();
          showToast('Bookmark removed from your shelf.');
        }
      });
    });
  }

  // Saved PYQ Shelf
  function renderStudyShelf() {
    const shelfEl = document.getElementById('candidate-pyq-shelf');
    if (!shelfEl) return;

    let bookmarkedStudy = [];
    if (window.CSOBookmarks && typeof window.CSOBookmarks.getBookmarksByType === 'function') {
      bookmarkedStudy = window.CSOBookmarks.getBookmarksByType('study');
    }

    const defaultItems = [
      { id: "def-pyq-1", title: "OPSC OCS General Studies Paper I — 5 Year PYQ Compilation", size: "3.4 MB", ext: "PDF", link: "https://assets.csodisha.org/pdf/pyq/2025/opsc-ocs-prelims-gs1-solved.pdf", badge: "Official Mirror" },
      { id: "def-pyq-2", title: "OSSC CGL Arithmetic & Reasoning Topic-Wise Question Bank", size: "2.1 MB", ext: "PDF", link: "https://assets.csodisha.org/pdf/pyq/2025/ossc-cgl-maths-bank.pdf", badge: "Cloudflare R2" }
    ];

    const items = bookmarkedStudy.length > 0 ? bookmarkedStudy : defaultItems;

    shelfEl.innerHTML = items.map(item => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-radius:10px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.08);">
        <div>
          <h4 style="font-size:12px;font-weight:600;color:#f8fafc;margin:0 0 2px;">${item.title}</h4>
          <span style="font-size:10px;color:#94a3b8;">${item.size || 'PDF'} • <span style="color:#2dd4bf;">${item.badge || 'Study Library'}</span></span>
        </div>
        <a href="${item.link || item.url || '#'}" target="_blank" rel="noopener noreferrer" style="padding:4px 10px;border-radius:6px;background:#1e293b;border:1px solid rgba(255,255,255,0.12);color:#e2e8f0;font-size:11px;text-decoration:none;">Download ⬇</a>
      </div>
    `).join('');
  }

  // Personalized Schemes Shelf
  function renderSchemes(session) {
    const listEl = document.getElementById('candidate-schemes-list');
    if (!listEl) return;

    const district = session?.district || 'Balasore (Baleswar)';
    const schemes = [
      { title: "Subhadra Yojana — Financial Aid", amount: "₹10,000 / Yr", target: "Women (21-60)", status: "Active DBT" },
      { title: "e-Medhabruti Higher Education Scholarship", amount: "Up to ₹10,000", target: "Undergraduate & Post-Graduate", status: "Open for Domicile" },
      { title: "KALIA Scholarship for Professional Education", amount: "Full Fee Waiver", target: "Farmers' Children (MBBS/Tech)", status: `Verified for ${district}` }
    ];

    listEl.innerHTML = schemes.map(sc => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-radius:10px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.08);">
        <div>
          <h4 style="font-size:12px;font-weight:700;color:#f8fafc;margin:0 0 2px;">${sc.title}</h4>
          <span style="font-size:10px;color:#94a3b8;"><strong style="color:#34d399;">${sc.amount}</strong> • ${sc.target}</span>
        </div>
        <span style="font-size:10px;padding:3px 8px;border-radius:6px;background:rgba(13,148,136,0.15);color:#2dd4bf;font-weight:700;">${sc.status}</span>
      </div>
    `).join('');
  }

  // In-Dashboard Scratchpad & Daily Notes
  function initScratchpad() {
    const textarea = document.getElementById('bp-candidate-scratchpad');
    const indicator = document.getElementById('scratchpad-save-indicator');
    if (!textarea) return;

    try {
      const savedNote = localStorage.getItem(NOTES_KEY);
      if (savedNote) textarea.value = savedNote;
    } catch(e) {}

    let timeout = null;
    textarea.addEventListener('input', () => {
      if (indicator) indicator.textContent = 'Saving...';
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        try {
          localStorage.setItem(NOTES_KEY, textarea.value);
          if (indicator) indicator.textContent = 'Auto-saved to device';
          if (window.CSOSync && typeof window.CSOSync.pushLocalStateToCloud === 'function') {
            window.CSOSync.pushLocalStateToCloud();
          }
        } catch(e) {}
      }, 500);
    });
  }

  // In-Dashboard Mock Test Score Logger
  function renderMockScores() {
    const tbody = document.getElementById('bp-mock-scores-body');
    if (!tbody) return;

    const scores = getMockScores();
    if (scores.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#64748b;padding:16px;">No mock tests logged yet. Click "+ Log New Mock" to track your first test score.</td></tr>`;
      return;
    }

    tbody.innerHTML = scores.map(item => `
      <tr>
        <td style="font-family:monospace;color:#94a3b8;">${item.date}</td>
        <td><strong style="color:#f8fafc;">${item.exam}</strong><br><span style="color:#64748b;font-size:11px;">${item.paper}</span></td>
        <td style="color:#2dd4bf;font-weight:700;">${item.score}</td>
        <td style="color:#94a3b8;">${item.max}</td>
        <td><span style="padding:2px 8px;border-radius:4px;background:rgba(16,185,129,0.15);color:#34d399;font-weight:700;">${item.accuracy}</span></td>
        <td><button type="button" class="btn-del-score" data-id="${item.id}" style="background:transparent;border:none;color:#f87171;cursor:pointer;font-size:12px;">✕</button></td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.btn-del-score').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const filtered = getMockScores().filter(x => x.id !== id);
        saveMockScores(filtered);
        renderMockScores();
        showToast('Mock test record deleted.');
      });
    });
  }

  function initMockScoreLogger() {
    renderMockScores();

    const addBtn = document.getElementById('bp-add-mock-score-btn');
    addBtn?.addEventListener('click', () => {
      const exam = prompt("Enter Examination Name (e.g. OPSC OCS Prelims, OSSC CGL):", "OPSC OCS Prelims");
      if (!exam) return;
      const paper = prompt("Enter Paper Name (e.g. GS Paper I, CSAT):", "General Studies Mock Test");
      if (!paper) return;
      const scoreStr = prompt("Marks Scored:", "135");
      const maxStr = prompt("Total Marks:", "200");
      const score = parseFloat(scoreStr) || 0;
      const max = parseFloat(maxStr) || 200;
      const accuracy = Math.round((score / max) * 100) + "%";

      const list = getMockScores();
      list.unshift({
        id: "mock-" + Date.now(),
        date: new Date().toISOString().split('T')[0],
        exam,
        paper,
        score,
        max,
        accuracy
      });
      saveMockScores(list);
      renderMockScores();
      showToast('Mock test score logged successfully!');
      if (window.CSOSync && typeof window.CSOSync.pushLocalStateToCloud === 'function') {
        window.CSOSync.pushLocalStateToCloud();
      }
    });
  }

  // Document Locker Reactive Checkboxes
  function initDocumentLocker() {
    let lockerState = {};
    try {
      const raw = localStorage.getItem(LOCKER_KEY);
      if (raw) lockerState = JSON.parse(raw);
    } catch(e) {}

    const items = document.querySelectorAll('.bp-locker-item');
    items.forEach((item, idx) => {
      const cb = item.querySelector('.bp-locker-cb');
      if (lockerState[idx] !== undefined) {
        cb.checked = lockerState[idx];
        item.classList.toggle('verified', cb.checked);
      }
      cb?.addEventListener('change', () => {
        lockerState[idx] = cb.checked;
        item.classList.toggle('verified', cb.checked);
        try {
          localStorage.setItem(LOCKER_KEY, JSON.stringify(lockerState));
        } catch(e) {}
        showToast(cb.checked ? 'Document marked as verified.' : 'Document status updated.');
        if (window.CSOSync && typeof window.CSOSync.pushLocalStateToCloud === 'function') {
          window.CSOSync.pushLocalStateToCloud();
        }
      });
    });
  }

  // Tab View Switcher (Self-Contained SPA)
  function switchTab(tabId) {
    if (!tabId) return;

    // Update active nav items
    document.querySelectorAll('.bp-nav-item').forEach(el => {
      if (el.dataset.tab === tabId || el.getAttribute('href') === `#${tabId}`) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    // Update view titles
    const titles = {
      'tab-overview': ['Dashboard Overview', 'Live exam preparation, syllabus milestones & downloads'],
      'tab-my-learning': ['My Learning & Syllabi', 'Stage-wise topic checklists, milestones, and syllabus coverage'],
      'tab-bookmarks': ['Private Library & Bookmarks', 'Curated repository of saved PYQs, bookmarked opportunities, and study notes'],
      'tab-achievements': ['Achievements & Badges', 'Study streaks, syllabus completion ratios & milestone tokens'],
      'tool-calendar': ['Exam Calendar & Timeline', 'Official countdowns for upcoming OPSC, OSSC, and B.Ed exams'],
      'tool-locker': ['Document Locker', 'KYC certificates, domicile proofs, and examination marksheets'],
      'tool-notes': ['Revision Scratchpad & Daily Notes', 'Aspirant notepad for historical milestones and formulas'],
      'tool-analytics': ['Mock Score Tracker & Diagnostics', 'Test series analytics, accuracy ratios, and mark logger'],
      'tool-study-timer': ['Study Focus Timer & Pomodoro', 'Targeted 25-minute deep syllabus study intervals'],
      'tool-exam-calculator': ['Cutoff & Negative Marks Calculator', 'Exam score forecaster, penalty deduction & accuracy calculator'],
      'tool-daily-drill': ['Daily Odisha GK Rapid Flash Drill', 'High-frequency Odisha history, polity & geography recall practice'],
      'tab-profile-settings': ['Profile & Account Settings', 'Manage personal preferences, target exams, and export data backup']
    };

    if (titles[tabId]) {
      const viewTitle = document.getElementById('bp-view-title');
      const viewSub = document.getElementById('bp-view-subtitle');
      if (viewTitle) viewTitle.textContent = titles[tabId][0];
      if (viewSub) viewSub.textContent = titles[tabId][1];
    }

    // Toggle tab views
    document.querySelectorAll('.bp-tab-view').forEach(view => {
      if (view.id === tabId) {
        view.classList.add('active');
      } else {
        view.classList.remove('active');
      }
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Profile Editor Modal
  function openProfileEditorModal(currentSession) {
    let existingModal = document.getElementById('cso-profile-editor-modal');
    if (existingModal) existingModal.remove();

    const currentName = currentSession?.fullName || currentSession?.name || 'RAMESH BISWAL';
    const currentMobile = currentSession?.mobile || currentSession?.phone || '9876543210';
    const currentDistrict = currentSession?.district || 'Balasore (Baleswar)';
    const selectedExams = Array.isArray(currentSession?.targetExams) ? currentSession.targetExams : ['opsc', 'ossc'];

    const districtOptions = ODISHA_DISTRICTS.map(d => {
      const isSel = (d.toLowerCase() === currentDistrict.toLowerCase()) || currentDistrict.toLowerCase().includes(d.toLowerCase());
      return `<option value="${d}" ${isSel ? 'selected' : ''}>${d}</option>`;
    }).join('');

    const examCheckboxes = [
      { key: 'opsc', label: 'OPSC (OCS / OAS / OFS)' },
      { key: 'ossc', label: 'OSSC (CGL / CHSL / CTSRE)' },
      { key: 'osssc', label: 'OSSSC (RI / ARI / Amin / Forest Guard)' },
      { key: 'teaching', label: 'Teaching (Odisha B.Ed / OTET / OSSTET)' },
      { key: 'police', label: 'Odisha Police (SI / Constable)' }
    ].map(item => {
      const isChecked = selectedExams.includes(item.key);
      return `
        <label style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:6px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);cursor:pointer;font-size:12px;color:#e2e8f0;">
          <input type="checkbox" name="edit_target_exams" value="${item.key}" ${isChecked ? 'checked' : ''} style="accent-color:#0d9488;cursor:pointer;" />
          <span>${item.label}</span>
        </label>
      `;
    }).join('');

    const modal = document.createElement('div');
    modal.id = 'cso-profile-editor-modal';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,0.85);backdrop-filter:blur(6px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;';

    modal.innerHTML = `
      <div style="background:#0f172a;border:1px solid rgba(255,255,255,0.12);border-radius:18px;max-width:500px;width:100%;box-shadow:0 24px 48px rgba(0,0,0,0.7);overflow:hidden;">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.02);">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:18px;">⚙️</span>
            <h3 style="margin:0;font-size:16px;font-weight:700;color:#f8fafc;">Aspirant Profile &amp; Preferences</h3>
          </div>
          <button type="button" id="btn-close-profile-editor" style="background:transparent;border:none;color:#94a3b8;font-size:18px;cursor:pointer;">✕</button>
        </div>

        <form id="cso-profile-editor-form" style="padding:20px;display:flex;flex-direction:column;gap:14px;max-height:80vh;overflow-y:auto;">
          <div>
            <label style="display:block;font-size:12px;font-weight:600;color:#cbd5e1;margin-bottom:6px;">Full Name *</label>
            <input type="text" id="edit-candidate-name" value="${currentName}" required style="width:100%;box-sizing:border-box;padding:9px 12px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#f8fafc;font-size:13px;" />
          </div>

          <div>
            <label style="display:block;font-size:12px;font-weight:600;color:#cbd5e1;margin-bottom:6px;">Mobile Number (10 digits) *</label>
            <input type="tel" id="edit-candidate-mobile" value="${currentMobile}" maxlength="10" required style="width:100%;box-sizing:border-box;padding:9px 12px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#f8fafc;font-size:13px;" />
          </div>

          <div>
            <label style="display:block;font-size:12px;font-weight:600;color:#cbd5e1;margin-bottom:6px;">Home District in Odisha *</label>
            <select id="edit-candidate-district" style="width:100%;box-sizing:border-box;padding:9px 12px;background:#1e293b;border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:#f8fafc;font-size:13px;">
              ${districtOptions}
            </select>
          </div>

          <div>
            <label style="display:block;font-size:12px;font-weight:600;color:#cbd5e1;margin-bottom:8px;">Target Examinations &amp; Streams</label>
            <div style="flex-direction:column;gap:6px;display:flex;">
              ${examCheckboxes}
            </div>
          </div>

          <div style="display:flex;align-items:center;justify-content:flex-end;gap:10px;margin-top:10px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.08);">
            <button type="button" id="btn-cancel-profile-editor" style="background:transparent;border:1px solid rgba(255,255,255,0.12);color:#cbd5e1;border-radius:8px;padding:8px 16px;font-size:12px;cursor:pointer;">Cancel</button>
            <button type="submit" style="background:#0d9488;color:#ffffff;border:none;border-radius:8px;padding:8px 20px;font-size:12px;font-weight:700;cursor:pointer;">Save Changes ✓</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    const closeModal = () => modal.remove();
    document.getElementById('btn-close-profile-editor')?.addEventListener('click', closeModal);
    document.getElementById('btn-cancel-profile-editor')?.addEventListener('click', closeModal);

    document.getElementById('cso-profile-editor-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const newName = document.getElementById('edit-candidate-name').value.trim();
      const newMobile = document.getElementById('edit-candidate-mobile').value.trim();
      const newDistrict = document.getElementById('edit-candidate-district').value;
      const checkedBoxes = Array.from(document.querySelectorAll('input[name="edit_target_exams"]:checked'));
      const newExams = checkedBoxes.map(cb => cb.value);

      const updatedSession = {
        ...(currentSession || {}),
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
      } catch(err) {}

      renderUserProfile(updatedSession);
      renderSchemes(updatedSession);
      modal.remove();
      showToast('Aspirant Profile successfully updated!');
    });
  }

  // Universal Search Overlay Modal (Ctrl + K)
  function initUniversalSearch() {
    const overlay = document.getElementById('bp-search-overlay');
    const input = document.getElementById('bp-search-modal-input');
    const results = document.getElementById('bp-search-modal-results');
    const closeBtn = document.getElementById('bp-search-modal-close');
    const topbarTrigger = document.getElementById('bp-topbar-search-trigger');
    const sidebarTrigger = document.getElementById('tool-search-btn');

    const openSearch = () => {
      if (overlay) {
        overlay.classList.add('open');
        overlay.setAttribute('aria-hidden', 'false');
        setTimeout(() => input?.focus(), 50);
      }
    };

    const closeSearch = () => {
      if (overlay) {
        overlay.classList.remove('open');
        overlay.setAttribute('aria-hidden', 'true');
        if (input) input.value = '';
      }
    };

    topbarTrigger?.addEventListener('click', openSearch);
    sidebarTrigger?.addEventListener('click', (e) => {
      e.preventDefault();
      openSearch();
    });
    closeBtn?.addEventListener('click', closeSearch);

    overlay?.addEventListener('click', (e) => {
      if (e.target === overlay) closeSearch();
    });

    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openSearch();
      }
      if (e.key === 'Escape' && overlay?.classList.contains('open')) {
        closeSearch();
      }
    });

    input?.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      if (!q) {
        results.innerHTML = `<div style="padding:16px;text-align:center;color:#64748b;font-size:13px;">Type to search across OPSC, OSSC, B.Ed and Odisha study materials...</div>`;
        return;
      }

      const matches = [];
      Object.keys(SYLLABUS_CHECKLISTS).forEach(examKey => {
        const syl = SYLLABUS_CHECKLISTS[examKey];
        syl.stages.forEach(stage => {
          stage.topics.forEach(t => {
            if (t.label.toLowerCase().includes(q) || syl.name.toLowerCase().includes(q)) {
              matches.push({ title: t.label, exam: syl.short, type: "Topic" });
            }
          });
        });
      });

      if (matches.length === 0) {
        results.innerHTML = `<div style="padding:16px;text-align:center;color:#94a3b8;font-size:13px;">No direct syllabus matches found for "<strong>${q}</strong>".</div>`;
        return;
      }

      results.innerHTML = matches.slice(0, 6).map(m => `
        <div style="padding:10px 12px;border-radius:8px;background:rgba(255,255,255,0.03);display:flex;align-items:center;justify-content:space-between;cursor:pointer;transition:background 0.15s;">
          <div>
            <h5 style="margin:0 0 2px;font-size:13px;color:#f8fafc;">${m.title}</h5>
            <span style="font-size:10px;color:#2dd4bf;font-weight:700;">${m.exam} • ${m.type}</span>
          </div>
          <span style="font-size:12px;color:#64748b;">Jump →</span>
        </div>
      `).join('');

      results.querySelectorAll('div').forEach(item => {
        item.addEventListener('click', () => {
          closeSearch();
          switchTab('tab-my-learning');
        });
      });
    });
  }

  // Sidebar Collapse / Expand & Mobile Drawer Handlers
  function initSidebar() {
    const sidebar = document.getElementById('bp-sidebar');
    const toggleBtn = document.getElementById('bp-sidebar-toggle');
    const mobileBtn = document.getElementById('bp-mobile-menu-trigger');
    const toggleIcon = toggleBtn?.querySelector('.bp-toggle-icon');

    // Desktop Compact / Expanded
    toggleBtn?.addEventListener('click', () => {
      sidebar?.classList.toggle('collapsed');
      const isCollapsed = sidebar?.classList.contains('collapsed');
      if (toggleIcon) toggleIcon.textContent = isCollapsed ? '▶' : '◀';
    });

    // Mobile Drawer Toggle
    mobileBtn?.addEventListener('click', () => {
      sidebar?.classList.toggle('mobile-open');
    });

    document.addEventListener('click', (e) => {
      if (window.innerWidth <= 768 && sidebar?.classList.contains('mobile-open')) {
        if (!sidebar.contains(e.target) && e.target !== mobileBtn) {
          sidebar.classList.remove('mobile-open');
        }
      }
    });

    // Sidebar Navigation Click Routing (Self-Contained SPA)
    document.querySelectorAll('.bp-nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const href = item.getAttribute('href');
        if (href && href.startsWith('#')) {
          e.preventDefault();
          const tabId = href.substring(1);
          switchTab(tabId);
          if (window.innerWidth <= 768) {
            sidebar?.classList.remove('mobile-open');
          }
        }
      });
    });

    // Internal tab jump links
    document.querySelectorAll('.bp-nav-switch').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = link.dataset.tab;
        if (tab) switchTab(tab);
      });
    });

    // Hero Card Jump buttons
    document.querySelectorAll('.bp-btn-jump-checklist').forEach(btn => {
      btn.addEventListener('click', () => {
        activeChecklistExam = btn.dataset.exam || 'opsc';
        switchTab('tab-my-learning');
        renderChecklistTracker();
      });
    });

    // Profile Modals
    document.getElementById('bp-topbar-user-pill')?.addEventListener('click', () => {
      openProfileEditorModal(getSession());
    });
    document.getElementById('bp-sidebar-user-pill')?.addEventListener('click', () => {
      openProfileEditorModal(getSession());
    });
    document.getElementById('sidebar-nav-profile')?.addEventListener('click', (e) => {
      e.preventDefault();
      openProfileEditorModal(getSession());
    });

    // Logout Action Button
    document.getElementById('bp-topbar-logout-btn')?.addEventListener('click', handleCandidateLogout);

    // Exam Filter Chips in Overview
    document.querySelectorAll('#bp-exam-filter-chips .bp-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('#bp-exam-filter-chips .bp-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const filter = chip.dataset.filter;

        document.querySelectorAll('#bp-hero-cards-mount .bp-exam-card').forEach(card => {
          if (filter === 'all' || card.dataset.examCard === filter) {
            card.style.display = 'flex';
          } else {
            card.style.display = 'none';
          }
        });
      });
    });
  }

  // Candidate Data Portability Export Handler
  function initDataPortability() {
    const exportBtn = document.getElementById('btn-export-candidate-data');
    exportBtn?.addEventListener('click', () => {
      const session = getSession() || {};
      const candidateName = session.fullName || session.name || 'Candidate';

      let bookmarks = [];
      try {
        const rawBm = localStorage.getItem('cso_candidate_bookmarks_v1');
        if (rawBm) bookmarks = JSON.parse(rawBm);
      } catch(e) {}

      let locker = {};
      try {
        const rawLocker = localStorage.getItem(LOCKER_KEY);
        if (rawLocker) locker = JSON.parse(rawLocker);
      } catch(e) {}

      const candidateData = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        candidate: session,
        checklist: getSavedChecklists(),
        bookmarks: bookmarks,
        documentLocker: locker,
        revisionNotes: localStorage.getItem(NOTES_KEY) || '',
        mockScores: getMockScores()
      };

      try {
        const jsonStr = JSON.stringify(candidateData, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
        const cleanName = candidateName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
        const dateStr = new Date().toISOString().slice(0, 10);
        const filename = `CSO_Study_Data_${cleanName}_${dateStr}.json`;

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast('Study data archive downloaded successfully.');
      } catch(err) {
        console.error('Failed to export study data', err);
        showToast('Failed to export study data archive.', 'error');
      }
    });

    document.getElementById('btn-open-profile-editor-tab')?.addEventListener('click', () => {
      openProfileEditorModal(getSession());
    });
  }

  // ==========================================================================
  // Innovation 1: Candidate Study Focus Timer (Pomodoro Sprint)
  // ==========================================================================
  function initStudyFocusTimer() {
    const display = document.getElementById('timer-display');
    const toggleBtn = document.getElementById('btn-timer-toggle');
    const resetBtn = document.getElementById('btn-timer-reset');
    const modeBtns = document.querySelectorAll('.bp-timer-mode-btn');
    const sprintCountEl = document.getElementById('timer-sprints-count');

    if (!display || !toggleBtn) return;

    let durationSeconds = 25 * 60;
    let remainingSeconds = durationSeconds;
    let timerInterval = null;
    let isRunning = false;
    let completedSprints = 0;

    function formatTime(secs) {
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    function updateDisplay() {
      display.textContent = formatTime(remainingSeconds);
    }

    modeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        if (isRunning) {
          clearInterval(timerInterval);
          isRunning = false;
          toggleBtn.textContent = '▶ Start Session';
          toggleBtn.style.background = '#0d9488';
        }
        modeBtns.forEach(b => {
          b.classList.remove('active');
          b.style.background = 'rgba(255,255,255,0.06)';
          b.style.color = '#94a3b8';
        });
        btn.classList.add('active');
        btn.style.background = '#0284c7';
        btn.style.color = '#ffffff';

        const mins = parseInt(btn.dataset.minutes, 10) || 25;
        durationSeconds = mins * 60;
        remainingSeconds = durationSeconds;
        updateDisplay();
      });
    });

    toggleBtn.addEventListener('click', () => {
      if (!isRunning) {
        isRunning = true;
        toggleBtn.textContent = '⏸ Pause';
        toggleBtn.style.background = '#f59e0b';
        timerInterval = setInterval(() => {
          if (remainingSeconds > 0) {
            remainingSeconds--;
            updateDisplay();
          } else {
            clearInterval(timerInterval);
            isRunning = false;
            toggleBtn.textContent = '▶ Start Session';
            toggleBtn.style.background = '#0d9488';
            completedSprints++;
            if (sprintCountEl) sprintCountEl.textContent = completedSprints;
            showToast('🎉 Focus Sprint completed! Take a 5-minute breather.');
          }
        }, 1000);
      } else {
        clearInterval(timerInterval);
        isRunning = false;
        toggleBtn.textContent = '▶ Resume';
        toggleBtn.style.background = '#0d9488';
      }
    });

    resetBtn?.addEventListener('click', () => {
      clearInterval(timerInterval);
      isRunning = false;
      remainingSeconds = durationSeconds;
      updateDisplay();
      toggleBtn.textContent = '▶ Start Session';
      toggleBtn.style.background = '#0d9488';
    });
  }

  // ==========================================================================
  // Innovation 2: Odisha Competitive Exam Cutoff & Marks Calculator
  // ==========================================================================
  function initExamCalculator() {
    const schemeSelect = document.getElementById('calc-exam-scheme');
    const correctInput = document.getElementById('calc-correct-input');
    const incorrectInput = document.getElementById('calc-incorrect-input');
    const totalInput = document.getElementById('calc-total-input');
    const penaltyInput = document.getElementById('calc-penalty-input');
    const calcBtn = document.getElementById('btn-run-calc');

    const netScoreEl = document.getElementById('calc-net-score');
    const grossMarksEl = document.getElementById('calc-gross-marks');
    const penaltyDeductedEl = document.getElementById('calc-penalty-deducted');
    const accuracyRateEl = document.getElementById('calc-accuracy-rate');
    const unattemptedEl = document.getElementById('calc-unattempted');

    if (!calcBtn || !correctInput) return;

    const schemes = {
      opsc_ocs_p1: { total: 100, markPerQuestion: 2.0, penalty: 0.66 },
      opsc_ocs_p2: { total: 80, markPerQuestion: 2.5, penalty: 0.83 },
      ossc_cgl: { total: 150, markPerQuestion: 1.0, penalty: 0.25 },
      bed_exam: { total: 100, markPerQuestion: 1.0, penalty: 0.25 }
    };

    schemeSelect?.addEventListener('change', () => {
      const key = schemeSelect.value;
      if (schemes[key]) {
        totalInput.value = schemes[key].total;
        penaltyInput.value = schemes[key].penalty;
        calculateScore();
      }
    });

    function calculateScore() {
      const correct = Math.max(0, parseInt(correctInput.value, 10) || 0);
      const incorrect = Math.max(0, parseInt(incorrectInput.value, 10) || 0);
      const total = Math.max(1, parseInt(totalInput.value, 10) || 100);
      const penalty = parseFloat(penaltyInput.value) || 0;

      const schemeKey = schemeSelect?.value || 'opsc_ocs_p1';
      const markPerQ = schemes[schemeKey] ? schemes[schemeKey].markPerQuestion : 1.0;

      const attempted = correct + incorrect;
      const unattempted = Math.max(0, total - attempted);
      const gross = correct * markPerQ;
      const penaltyAmt = incorrect * penalty;
      const net = Math.max(0, gross - penaltyAmt);
      const accuracy = attempted > 0 ? ((correct / attempted) * 100).toFixed(2) : '0.00';

      if (netScoreEl) netScoreEl.textContent = net.toFixed(2);
      if (grossMarksEl) grossMarksEl.textContent = gross.toFixed(2);
      if (penaltyDeductedEl) penaltyDeductedEl.textContent = `-${penaltyAmt.toFixed(2)}`;
      if (accuracyRateEl) accuracyRateEl.textContent = `${accuracy}%`;
      if (unattemptedEl) unattemptedEl.textContent = unattempted;
    }

    calcBtn.addEventListener('click', calculateScore);
    correctInput.addEventListener('input', calculateScore);
    incorrectInput.addEventListener('input', calculateScore);
  }

  // ==========================================================================
  // Innovation 3: Daily Odisha GK Rapid Flash Drill
  // ==========================================================================
  function initDailyFlashQuiz() {
    const questions = [
      {
        q: "In which year did the historic Paika Rebellion take place in Odisha under the leadership of Bakshi Jagabandhu?",
        options: ["1803", "1817", "1857", "1921"],
        answer: 1,
        exp: "The Paika Rebellion erupted in Khordha, Odisha in 1817 under the military command of Bakshi Jagabandhu Bidyadhar Mohapatra."
      },
      {
        q: "Which river is famously known as the 'Lifeline of Odisha'?",
        options: ["Baitarani River", "Subarnarekha River", "Mahanadi River", "Brahmani River"],
        answer: 2,
        exp: "The Mahanadi River is the largest river in Odisha and home to the Hirakud Dam, one of the longest earthen dams in the world."
      },
      {
        q: "In which year was the separate Odisha province officially formed under British India?",
        options: ["1912", "1936", "1947", "1950"],
        answer: 1,
        exp: "Odisha became the first Indian state formed on a linguistic basis on 1st April 1936, commemorated annually as Utkala Dibasa."
      },
      {
        q: "Which national park in Odisha is designated as a UNESCO World Heritage site candidate and renowned for salt-water crocodiles and mangroves?",
        options: ["Similipal National Park", "Bhitarkanika National Park", "Karlapat Wildlife Sanctuary", "Debrigarh Sanctuary"],
        answer: 1,
        exp: "Bhitarkanika National Park in Kendrapara district is famous for its rich mangrove ecosystem, giant saltwater crocodiles, and Olive Ridley turtle nesting grounds."
      },
      {
        q: "Who was revered as 'Utkal Mani' (Jewel of Utkal) for his legendary social service and founding the Satyabadi Bana Bidyalaya?",
        options: ["Madhusudan Das", "Gopabandhu Das", "Fakir Mohan Senapati", "Gourishankar Ray"],
        answer: 1,
        exp: "Pandit Gopabandhu Das is lovingly called 'Utkal Mani' for his dedicated relief work during Odisha floods and famine, and for authoring Dharmapada and Bandira Atmakatha."
      }
    ];

    let currentIndex = 0;
    let score = 0;

    const qText = document.getElementById('quiz-question-text');
    const optContainer = document.getElementById('quiz-options-container');
    const expBox = document.getElementById('quiz-explanation-box');
    const nextBtn = document.getElementById('btn-quiz-next');
    const progLabel = document.getElementById('quiz-progress-label');
    const scoreBadge = document.getElementById('quiz-score-badge');

    if (!qText || !optContainer) return;

    function renderQuestion() {
      if (currentIndex >= questions.length) {
        // Quiz completed
        qText.textContent = `🎉 Flash Drill Complete! Final Score: ${score} / ${questions.length}`;
        optContainer.innerHTML = `
          <div style="text-align:center;padding:20px;background:rgba(255,255,255,0.03);border-radius:12px;">
            <p style="font-size:14px;color:#2dd4bf;margin:0 0 12px;font-weight:700;">Excellent revision cadence! Consistent daily recall boosts Prelims accuracy.</p>
            <button type="button" id="btn-restart-quiz" style="background:#0d9488;color:#fff;border:none;border-radius:8px;padding:8px 18px;font-size:12px;font-weight:700;cursor:pointer;">↺ Retake Drill</button>
          </div>
        `;
        if (expBox) expBox.style.display = 'none';
        if (nextBtn) nextBtn.style.display = 'none';
        document.getElementById('btn-restart-quiz')?.addEventListener('click', () => {
          currentIndex = 0;
          score = 0;
          if (scoreBadge) scoreBadge.textContent = 'Score: 0';
          renderQuestion();
        });
        return;
      }

      const current = questions[currentIndex];
      if (progLabel) progLabel.textContent = `Question ${currentIndex + 1} of ${questions.length}`;
      qText.textContent = current.q;
      if (expBox) expBox.style.display = 'none';
      if (nextBtn) nextBtn.style.display = 'none';

      optContainer.innerHTML = '';
      current.options.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = opt;
        btn.style.cssText = `
          width: 100%;
          text-align: left;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 10px;
          padding: 12px 16px;
          color: #f8fafc;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        `;

        btn.addEventListener('click', () => {
          // Disable all buttons in container
          optContainer.querySelectorAll('button').forEach(b => b.disabled = true);

          if (idx === current.answer) {
            btn.style.background = 'rgba(16,185,129,0.2)';
            btn.style.borderColor = '#10b981';
            btn.style.color = '#34d399';
            score++;
            if (scoreBadge) scoreBadge.textContent = `Score: ${score}`;
          } else {
            btn.style.background = 'rgba(239,68,68,0.2)';
            btn.style.borderColor = '#ef4444';
            btn.style.color = '#f87171';

            // Highlight correct one
            const correctBtn = optContainer.querySelectorAll('button')[current.answer];
            if (correctBtn) {
              correctBtn.style.background = 'rgba(16,185,129,0.2)';
              correctBtn.style.borderColor = '#10b981';
              correctBtn.style.color = '#34d399';
            }
          }

          if (expBox) {
            expBox.innerHTML = `<strong>Answer Note:</strong> ${current.exp}`;
            expBox.style.display = 'block';
          }

          if (nextBtn) nextBtn.style.display = 'inline-block';
        });

        optContainer.appendChild(btn);
      });
    }

    nextBtn?.addEventListener('click', () => {
      currentIndex++;
      renderQuestion();
    });

    renderQuestion();
  }

  // Initialization
  function init() {
    const session = getSession();
    renderUserProfile(session);
    initSidebar();
    initUniversalSearch();
    updateExamCards();
    renderUpcomingLessons();
    renderChecklistTracker();
    renderMilestones();
    renderJobsShelf();
    renderStudyShelf();
    renderSchemes(session);
    initScratchpad();
    initMockScoreLogger();
    initDocumentLocker();
    initDataPortability();
    initStudyFocusTimer();
    initExamCalculator();
    initDailyFlashQuiz();

    // Listen for bookmark updates
    window.addEventListener('cso:bookmarks-updated', () => {
      renderJobsShelf();
      renderStudyShelf();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window);
