/* Master Command Suite — Live D1/R2 module routing.
   All modules route to live D1 + R2 views via CSOCms (cms/cms.js) with zero fake localStorage placeholders. */
(function () {
  'use strict';

  var CONTENT = [['current-affairs', 'Current Affairs'], ['jobs', 'Job Alerts'], ['jobs-directory', 'Jobs Directory'], ['schemes', 'Schemes'], ['schemes-directory', 'Schemes Tree']];
  var CONTENT_SUITE = [
    ['content/all', 'All Content'],
    ['content/articles', 'Articles & Blogs'],
    ['content/news', 'News & Updates'],
    ['content/current-affairs', 'Current Affairs'],
    ['content/announcements', 'Announcements & Notices'],
    ['content/featured', 'Featured Content'],
    ['content/categories', 'Content Categories'],
    ['content/tags', 'Tags'],
    ['content/calendar', 'Editorial Calendar'],
    ['content/workflow', 'Publishing Workflow'],
    ['content/scheduled', 'Scheduled Content'],
    ['content/archive', 'Content Archive'],
    ['content/revisions', 'Content Revisions'],
    ['content/bulk', 'Bulk Content Operations']
  ];
  var EDU = [['study-library-directory', 'Study Directory'], ['mock-tests', 'Mock Tests'], ['syllabus', 'Syllabus'], ['pyq', 'PYQs']];
  var STUDY_SUITE = [
    ['study-library/early-childhood', 'Early Childhood & Primary Education'],
    ['study-library/school-higher-sec', 'School & Higher Secondary Education'],
    ['study-library/ug-pg-research', 'Undergraduate, Postgraduate & Research'],
    ['study-library/competitive-teacher', 'Competitive Exams & Teacher Education'],
    ['study-library/vocational-digital', 'Professional, Vocational & Digital Skills'],
    ['study-library/subjects-materials', 'Subjects, Languages & Study Materials'],
    ['study-library/international-inclusive', 'International & Inclusive Education'],
    ['study-library/life-skills-culture', 'Life Skills, Culture & Lifelong Learning'],
    ['study-library/libraries-support', 'Libraries, Educators & Learning Support'],
    ['study-library/odisha-study-hub', 'Odisha Study Hub & Resource Organisation']
  ];
  var SITE = [['pages', 'All Pages'], ['about-directory', 'About CSO Directory'], ['pages/legal', 'Info & Legal'], ['banner', 'Homepage & Banner'], ['seo', 'SEO & Sitemaps']];
  var OPS = [['dashboard', 'Overview'], ['freshness', 'Freshness Audit'], ['feedback', 'Feedback Queue'], ['operations', 'Operations & Backups'], ['diagnostics', 'Site Health']];
  var OPS_SUITE = [
    ['operations/snapshots', 'Platform Snapshots'],
    ['operations/drill', 'DR Drill'],
    ['operations/restore', 'Granular Restore'],
    ['operations/replica', 'D1 Replica Switchover'],
    ['operations/vault', 'R2 Cold Vault'],
    ['operations/schema', 'DDL Schema Journal'],
    ['operations/cache', 'Edge Cache Warmer'],
    ['operations/airgap', 'Air-Gapped Bundle'],
    ['operations/health', 'Failover Sentinel'],
    ['operations/verify', 'SHA-256 Integrity'],
    ['operations/vacuum', 'Dead-Letter Vacuum'],
    ['operations/freeze', 'Read-Only Freeze'],
    ['operations/forensics', 'Forensic Diffs'],
    ['operations/retention', 'Backup Retention'],
    ['operations/canary', 'Canary Health'],
    ['operations/runbooks', 'DR Playbook & SOPs']
  ];
  var SEC = [['audit/security', 'Security Audit'], ['incidents', 'Incidents'], ['audit', 'All Events']];
  var SEC_SUITE = [
    ['security/rbac', 'RBAC Hierarchy & Role Entitlements'],
    ['security/engine-guards', 'Publish & Mutation Guards (6 Engines)'],
    ['security/sessions', 'Session Lifecycle & Token Expiry'],
    ['security/turnstile', 'Turnstile & Edge Bot Deterrence'],
    ['security/audit-timeline', 'Visual Audit Log Explorer'],
    ['security/ip-acl', 'IP Access Control & Geofencing'],
    ['security/2fa', 'Two-Factor Authentication & Hardware Keys'],
    ['security/pii', 'Sensitive Field Masking & PII'],
    ['security/api-keys', 'API Key & Token Scoping'],
    ['security/csrf', 'CSRF & Origin Integrity'],
    ['security/lockdown', 'Emergency Maintenance Lockdown'],
    ['security/dpdp', 'DPDP Act 2023 Compliance Vault'],
    ['security/incidents', 'Incident Response & Audit Export']
  ];
  var JOBS_SUITE = [
    ['jobs-directory/jobs-recruitment', 'Jobs & Recruitment'],
    ['jobs-directory/career-explorer', 'Career Explorer'],
    ['jobs-directory/eligibility-explorer', 'Eligibility & Qualification Explorer'],
    ['jobs-directory/courses-exams', 'Courses, Entrance Exams & Certifications'],
    ['jobs-directory/scholarships-support', 'Scholarships & Financial Support'],
    ['jobs-directory/international-overseas', 'International & Overseas Opportunities'],
    ['jobs-directory/career-employability', 'Career Development & Employability'],
    ['jobs-directory/institutions-portals', 'Institutions, Official Portals & Verification']
  ];
  var SCHEMES_SUITE = [
    ['schemes-directory/govt-public-welfare', 'Government & Public Welfare'],
    ['schemes-directory/education-employment', 'Education, Employment & Talent'],
    ['schemes-directory/agriculture-livelihoods', 'Agriculture, Business & Livelihoods'],
    ['schemes-directory/health-housing-protection', 'Health, Housing & Financial Protection'],
    ['schemes-directory/communities-beneficiaries', 'Communities & Special Beneficiaries'],
    ['schemes-directory/private-global-innovation', 'Private, Global & Innovation Support'],
    ['schemes-directory/find-schemes-eligibility', 'Find Schemes & Check Eligibility'],
    ['schemes-directory/citizen-services-verification', 'Citizen Services & Verification']
  ];
  var COMMUNITY_SUITE = [
    ['community-directory/local-odisha-communities', 'Local & Odisha Communities'],
    ['community-directory/students-educators-mentorship', 'Students, Educators & Mentorship'],
    ['community-directory/careers-business-networks', 'Careers, Business & Professional Networks'],
    ['community-directory/agriculture-rural-livelihoods', 'Agriculture & Rural Livelihoods'],
    ['community-directory/women-families-inclusion', 'Women, Families, Health & Inclusion'],
    ['community-directory/youth-ngos-volunteering', 'Youth, NGOs & Volunteering'],
    ['community-directory/culture-sports-traditional', 'Culture, Sports & Traditional Communities'],
    ['community-directory/environment-science-tech', 'Environment, Science & Technology'],
    ['community-directory/digital-international-forums', 'Digital, International & Community Forums'],
    ['community-directory/community-safety-governance', 'Community Directory, Safety & Governance']
  ];

  // Clean-Slate 5-Pillar Live D1 Routing (v231)
  var ROUTES = {
    'folder-jobs-careers': ['jobs', CONTENT],
    'folder-schemes-benefits': ['schemes', CONTENT],
    'folder-study-library': ['study-library-directory', EDU],
    'folder-community': ['feedback', OPS],
    'folder-about': ['about-directory', SITE]
  };

  var FOLDER_FALLBACKS = {
    'folder-jobs-careers': ['jobs', CONTENT],
    'folder-schemes-benefits': ['schemes', CONTENT],
    'folder-study-library': ['study-library-directory', EDU],
    'folder-community': ['feedback', OPS],
    'folder-about': ['about-directory', SITE]
  };

  function resolveRoute(folderId, moduleId) {
    if (ROUTES[moduleId]) return ROUTES[moduleId];
    if (FOLDER_FALLBACKS[folderId]) return FOLDER_FALLBACKS[folderId];
    return ['dashboard', OPS];
  }

  function renderSuiteStepper(suite, prefix, fallbackFolder, folderId, moduleId, currentRoute, root, host, ariaLabel) {
    var idx = -1;
    var m = String(moduleId || '').match(/-(\d{3})$/);
    if (m) {
      var parsedIdx = Number(m[1]) - 1;
      if (parsedIdx >= 0 && parsedIdx < suite.length) idx = parsedIdx;
    }
    if (idx < 0) idx = suite.findIndex(function (item) { return item[0] === currentRoute; });
    if (idx < 0) idx = 0;

    function moduleIdAt(i) {
      return prefix + String(i + 1).padStart(3, '0');
    }
    function navigateTo(nextIdx) {
      if (nextIdx < 0 || nextIdx >= suite.length) return;
      var nextModId = moduleIdAt(nextIdx);
      if (typeof window.selectModule === 'function') {
        window.selectModule(folderId || fallbackFolder, nextModId);
      } else if (window.CSOCms) {
        window.CSOCms.mount(host, suite[nextIdx][0], null);
      }
    }

    var prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.className = 'btn sm cso-ops-stepper-btn';
    prevBtn.textContent = '← Previous Module';
    prevBtn.disabled = idx <= 0;
    if (idx > 0) {
      prevBtn.setAttribute('aria-label', 'Previous Module: ' + suite[idx - 1][1]);
      prevBtn.addEventListener('click', function () { navigateTo(idx - 1); });
    } else {
      prevBtn.setAttribute('aria-label', 'Previous Module (none)');
    }

    var meta = document.createElement('div');
    meta.className = 'cso-ops-stepper-meta';
    var countSpan = document.createElement('span');
    countSpan.className = 'cso-ops-stepper-count cso-tabular';
    countSpan.textContent = 'Module ' + (idx + 1) + ' of ' + suite.length;
    var titleSpan = document.createElement('span');
    titleSpan.className = 'cso-ops-stepper-title';
    titleSpan.textContent = suite[idx][1];
    meta.appendChild(countSpan);
    meta.appendChild(titleSpan);

    var nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'btn sm cso-ops-stepper-btn';
    nextBtn.textContent = 'Next Module →';
    nextBtn.disabled = idx >= suite.length - 1;
    if (idx < suite.length - 1) {
      nextBtn.setAttribute('aria-label', 'Next Module: ' + suite[idx + 1][1]);
      nextBtn.addEventListener('click', function () { navigateTo(idx + 1); });
    } else {
      nextBtn.setAttribute('aria-label', 'Next Module (none)');
    }

    var nav = document.createElement('nav');
    nav.className = 'cso-ops-stepper';
    nav.setAttribute('aria-label', ariaLabel);
    nav.appendChild(prevBtn);
    nav.appendChild(meta);
    nav.appendChild(nextBtn);
    root.appendChild(nav);

    window._csoActiveStepperNav = {
      prev: function () { if (idx > 0) navigateTo(idx - 1); },
      next: function () { if (idx < suite.length - 1) navigateTo(idx + 1); },
      el: nav
    };
    if (!window._csoStepperKeyBound) {
      window._csoStepperKeyBound = true;
      window.addEventListener('keydown', function (ev) {
        if (!ev.altKey || ev.ctrlKey || ev.metaKey) return;
        var tag = (ev.target && ev.target.tagName) || '';
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        var active = window._csoActiveStepperNav;
        if (!active || !active.el || !active.el.isConnected) return;
        if (ev.key === 'ArrowLeft') {
          ev.preventDefault();
          active.prev();
        } else if (ev.key === 'ArrowRight') {
          ev.preventDefault();
          active.next();
        }
      });
    }
  }

  function render(folderId, moduleId, root, actions) {
    if (window.CSORestoredModules && window.CSORestoredModules.render(folderId, moduleId, root, actions)) {
      return true;
    }
    if (!window.CSOCms) return false;
    var r = resolveRoute(folderId, moduleId);
    if (actions) {
      var pill = document.createElement('span');
      pill.className = 'cso-live-pill';
      pill.textContent = '● Live · D1 / R2';
      actions.appendChild(pill);
    }
    var host = document.createElement('div');
    host.className = 'cms-embed';
    if (r[1] === OPS_SUITE) {
      var opsPrefix = String(moduleId || '').indexOf('module-17-') === 0 ? 'module-17-' : 'module-ops-';
      renderSuiteStepper(OPS_SUITE, opsPrefix, 'folder-17', folderId, moduleId, r[0], root, host, 'Operations & Disaster Recovery Module Stepper');
      root.appendChild(host);
      window.CSOCms.mount(host, r[0], null);
    } else if (r[1] === SEC_SUITE) {
      var secPrefix = String(moduleId || '').indexOf('module-16-') === 0 ? 'module-16-' : 'module-sec-';
      renderSuiteStepper(SEC_SUITE, secPrefix, 'folder-16', folderId, moduleId, r[0], root, host, 'Security, Privacy & RBAC Module Stepper');
      root.appendChild(host);
      window.CSOCms.mount(host, r[0], null);
    } else if (r[1] === CONTENT_SUITE) {
      renderSuiteStepper(CONTENT_SUITE, 'module-04-', 'folder-04', folderId, moduleId, r[0], root, host, 'Content & Publishing Module Stepper');
      root.appendChild(host);
      window.CSOCms.mount(host, r[0], null);
    } else if (r[1] === STUDY_SUITE) {
      renderSuiteStepper(STUDY_SUITE, 'module-sl-', 'folder-study-library', folderId, moduleId, r[0], root, host, 'Study Library Directory Module Stepper');
      root.appendChild(host);
      window.CSOCms.mount(host, r[0], null);
    } else if (r[1] === JOBS_SUITE) {
      renderSuiteStepper(JOBS_SUITE, 'module-jc-', 'folder-jobs-careers', folderId, moduleId, r[0], root, host, 'Jobs & Careers Directory Module Stepper');
      root.appendChild(host);
      window.CSOCms.mount(host, r[0], null);
    } else if (r[1] === SCHEMES_SUITE) {
      renderSuiteStepper(SCHEMES_SUITE, 'module-sb-', 'folder-schemes-benefits', folderId, moduleId, r[0], root, host, 'Schemes & Benefits Directory Module Stepper');
      root.appendChild(host);
      window.CSOCms.mount(host, r[0], null);
    } else if (r[1] === COMMUNITY_SUITE) {
      renderSuiteStepper(COMMUNITY_SUITE, 'module-cm-', 'folder-community', folderId, moduleId, r[0], root, host, 'Community Directory Module Stepper');
      root.appendChild(host);
      window.CSOCms.mount(host, r[0], null);
    } else {
      root.appendChild(host);
      window.CSOCms.mount(host, r[0], r[1]);
    }
    return true;
  }

  async function publishFlash(payload) {
    var cfg = payload && typeof payload === 'object' ? payload : {};
    var res = await fetch('/api/admin/banner', {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-CSO-CSRF': '1' },
      body: JSON.stringify({
        active: cfg.active !== undefined ? Boolean(cfg.active) : true,
        severity: String(cfg.severity || cfg.category || 'info'),
        headline: String(cfg.title || cfg.headline || ''),
        context: String(cfg.body || cfg.context || ''),
        ctaText: String(cfg.ctaText || 'View update'),
        ctaUrl: String(cfg.ctaUrl || '/')
      })
    });
    var d = await res.json().catch(function () { return {}; });
    if (!res.ok) throw new Error(d.error || 'Request failed (' + res.status + ')');
    return d;
  }

  async function getSiteManifest() {
    var res = await fetch('./site-manifest.json', { credentials: 'same-origin' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  }

  window.CSOLive = {
    render: render,
    resolveRoute: resolveRoute,
    publishFlash: publishFlash,
    getSiteManifest: getSiteManifest,
    routes: ROUTES
  };
})();
