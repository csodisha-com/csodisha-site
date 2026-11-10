/**
 * Common Sense Odisha (CSO) — Student Dashboard Portal Logic
 * Hydrates candidate dashboard from SuperStore state engines:
 * - cso_events_schedule_tree_v1: Active Exam Milestones & Countdown Timers
 * - cso_study_recursive_tree_v1: Saved Syllabi & PYQ Shelf with Cloudflare R2 downloads
 * - cso_schemes_recursive_tree_v2: Matching Scholarships & Direct Benefit Schemes
 * - LocalStorage: Interactive preparation milestones checklist
 */
(function(window) {
  'use strict';

  const SESSION_KEY = 'cso_candidate_session_v1';
  const CHECKLIST_KEY = 'cso_candidate_checklist_v1';

  function getSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) return JSON.parse(raw);
    } catch(e) {}
    return null;
  }

  function getSavedChecklist() {
    try {
      const raw = localStorage.getItem(CHECKLIST_KEY);
      if (raw) return JSON.parse(raw);
    } catch(e) {}
    return {};
  }

  function saveChecklist(map) {
    try {
      localStorage.setItem(CHECKLIST_KEY, JSON.stringify(map));
    } catch(e) {}
  }

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
        window.CSOCandidateAuth?.setSession({
          name: "Odisha Aspirant",
          email: "aspirant@csodisha.com",
          district: "Khordha (Bhubaneswar)",
          targetExams: ["opsc", "ossc", "schemes"],
          isGuest: true
        });
        window.location.reload();
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

    heroEl.innerHTML = `
      <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:16px;">
        <div style="display:flex;align-items:center;gap:16px;">
          <div style="width:52px;height:52px;border-radius:14px;background:#0d9488;color:#ffffff;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:800;box-shadow:0 4px 12px rgba(13,148,136,0.3);">
            ${session.name ? session.name.charAt(0).toUpperCase() : 'A'}
          </div>
          <div>
            <div style="display:flex;align-items:center;gap:8px;">
              <h1 style="font-size:20px;font-weight:800;color:#f8fafc;margin:0;">Namaskar, ${session.name}!</h1>
              <span style="background:rgba(16,185,129,0.15);color:#34d399;font-size:10px;padding:2px 6px;border-radius:4px;font-weight:700;">Active Aspirant</span>
            </div>
            <p style="font-size:12px;color:#94a3b8;margin:4px 0 0;">District: <strong style="color:#e2e8f0;">${session.district || 'Khordha (Bhubaneswar)'}</strong> • ${session.email || session.phone || 'Verified Offline Session'}</p>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
            ${examTags}
          </div>
          <button type="button" id="btn-edit-profile" style="background:transparent;border:none;color:#0d9488;font-size:11px;font-weight:600;cursor:pointer;padding:0;">Edit Target Exams ✎</button>
        </div>
      </div>
    `;

    document.getElementById('btn-edit-profile')?.addEventListener('click', () => {
      window.CSOCandidateAuth?.openModal('signup');
    });
  }

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

    // Fallback seed events if empty
    if (allEvents.length === 0) {
      allEvents = [
        { id: "EV-01", title: "OPSC Odisha Civil Services (OCS) Prelims 2026", titleOdia: "ଓପିଏସସି ସିଭିଲ ସର୍ଭିସେସ ପ୍ରିଲିମ୍ସ", eventStartDate: "2026-11-29", eventType: "Exam", venueDistrict: "All 30 Districts", officialPortalUrl: "https://opsc.gov.in" },
        { id: "EV-02", title: "OSSC Combined Graduate Level (CGL) Mains 2026", titleOdia: "ଓଏସଏସସି ସିଜିଏଲ ମୁଖ୍ୟ ପରୀକ୍ଷା", eventStartDate: "2026-12-14", eventType: "Exam", venueDistrict: "Bhubaneswar / Cuttack", officialPortalUrl: "https://ossc.gov.in" },
        { id: "EV-03", title: "OSSSC RI & ARI Practical Skill Test Schedule", titleOdia: "ଆରଆଇ ଏବଂ ଏଆରଆଇ କମ୍ପ୍ୟୁଟର ପରୀକ୍ଷା", eventStartDate: "2026-12-22", eventType: "Skill Test", venueDistrict: "District HQs", officialPortalUrl: "https://osssc.gov.in" },
        { id: "EV-04", title: "Odisha B.Ed Entrance Application Form Closing", titleOdia: "ବି.ଏଡ୍ ପ୍ରବେଶିକା ଆବେଦନ ଶେଷ ତାରିଖ", eventStartDate: "2026-12-05", eventType: "Deadline", venueDistrict: "Online State Portal", officialPortalUrl: "https://samsodisha.gov.in" }
      ];
    }

    // Compute remaining days
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

  function renderTracker() {
    const trackerEl = document.getElementById('candidate-tracker-list');
    const badgeEl = document.getElementById('tracker-completion-badge');
    if (!trackerEl) return;

    const saved = getSavedChecklist();

    const tasks = [
      { id: "task-01", label: "Download & Print Official Examination Syllabus" },
      { id: "task-02", label: "Complete 5 Years OPSC/OSSC Previous Year Papers (PYQ)" },
      { id: "task-03", label: "Master Odisha General Studies, History & Geography module" },
      { id: "task-04", label: "Daily Odia & English Language Grammar Revision" },
      { id: "task-05", label: "Verify Aadhaar Seeding for Scholarship / Subhadra Benefit" },
      { id: "task-06", label: "Full Length Mock Test & Speed Diagnostic Analysis" }
    ];

    let completed = 0;
    tasks.forEach(t => {
      if (saved[t.id]) completed++;
    });

    const percent = Math.round((completed / tasks.length) * 100);
    if (badgeEl) badgeEl.textContent = `${percent}% Completed`;

    trackerEl.innerHTML = tasks.map(t => {
      const isDone = !!saved[t.id];
      return `
        <label style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;background:${isDone ? 'rgba(13,148,136,0.1)' : 'rgba(15,23,42,0.4)'};border:1px solid ${isDone ? 'rgba(13,148,136,0.3)' : '#1e293b'};cursor:pointer;transition:all 0.2s;">
          <input type="checkbox" data-task-id="${t.id}" ${isDone ? 'checked' : ''} style="width:16px;height:16px;accent-color:#0d9488;cursor:pointer;" />
          <span style="font-size:12px;font-weight:500;color:${isDone ? '#e2e8f0' : '#94a3b8'};text-decoration:${isDone ? 'line-through' : 'none'};">${t.label}</span>
        </label>
      `;
    }).join('');

    trackerEl.querySelectorAll('input[type="checkbox"]').forEach(input => {
      input.addEventListener('change', (e) => {
        const taskId = e.target.dataset.taskId;
        saved[taskId] = e.target.checked;
        saveChecklist(saved);
        renderTracker();
      });
    });
  }

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
    renderTracker();
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
