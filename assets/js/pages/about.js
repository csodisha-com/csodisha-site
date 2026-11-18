/* Extracted from about.html for strict CSP (v151). */
(function() {
  function escapeText(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.textContent = str;
    return String(div.textContent).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function hydrateAboutMission() {
    var raw = null;
    try {
      raw = localStorage.getItem('cso_about_config');
    } catch (_) {}

    var config = null;
    if (raw) {
      try {
        config = JSON.parse(raw);
      } catch (_) {}
    }

    if (!config || typeof config !== 'object') {
      config = {
        hero: {
          headline: "Democratizing Academic & Career Intelligence for Odisha's Youth",
          subheadline: "A dedicated digital gateway providing verified syllabi, state exam patterns, and scholarship navigation across all 30 districts.",
          badge: "Official Mission Portal",
          enabled: true
        },
        statements: {
          mission: "To eliminate geographic and socio-economic information barriers for competitive examination aspirants in Odisha by delivering authenticated, zero-cost academic intelligence.",
          vision: "An Odisha where every candidate from Mayurbhanj to Koraput possesses equal access to authenticated academic tools."
        },
        pillars: [
          { title: "Gazette Accuracy", description: "Zero speculation. Every syllabus breakdown is verified against official state notification releases.", active: true },
          { title: "Universal 30-District Access", description: "Digital access architected for seamless loading even in remote rural blocks with low-bandwidth connections.", active: true },
          { title: "100% Free Public Resource", description: "Free access to structured study templates, previous papers, and transparent guidance.", active: true },
          { title: "Aspirant-Centric Architecture", description: "Interface built specifically for seamless navigation on mobile devices and low-spec hardware.", active: true }
        ],
        milestones: [
          { year: "2023", title: "Foundation & Prototype", description: "Inception of Common Sense Odisha to address rural information asymmetry." },
          { year: "2024", title: "Syllabus Digitization", description: "Coverage of OSSC, OPSC, and Odisha B.Ed curricula." },
          { year: "2025", title: "Statewide Expansion", description: "Reaching aspirants across all 30 districts of Odisha." },
          { year: "2026", title: "Sovereign Admin Suite", description: "Deployment of 19-folder Cloudflare Pages super admin control architecture." }
        ]
      };
    }

    // Hero Hydration
    var heroSection = document.getElementById('about-hero-section');
    var heroHeadline = (config.hero && config.hero.headline) || config.headline || '';
    var heroSub = (config.hero && config.hero.subheadline) || config.subheadline || '';
    var heroBadge = (config.hero && config.hero.badge) || 'Official Mission Portal';
    var heroEnabled = config.hero ? (config.hero.enabled !== false) : true;

    if (heroSection) {
      heroSection.style.display = heroEnabled ? 'block' : 'none';
    }

    var badgeEl = document.getElementById('about-badge');
    if (badgeEl && heroBadge) badgeEl.textContent = heroBadge;

    var headlineEl = document.getElementById('about-headline');
    if (headlineEl && heroHeadline) headlineEl.textContent = heroHeadline;

    var subEl = document.getElementById('about-subheadline');
    if (subEl && heroSub) subEl.textContent = heroSub;

    // Statements
    var mission = (config.statements && config.statements.mission) || config.mission || '';
    var vision = (config.statements && config.statements.vision) || config.vision || '';

    var missionEl = document.getElementById('about-mission-text');
    if (missionEl && mission) missionEl.textContent = mission;

    var visionEl = document.getElementById('about-vision-text');
    if (visionEl && vision) visionEl.textContent = vision;

    // Pillars
    var pillarsGrid = document.getElementById('about-pillars-grid');
    var pillarsList = Array.isArray(config.pillars) ? config.pillars.filter(function(p) { return p.active !== false; }) : [];
    if (pillarsGrid && pillarsList.length > 0) {
      csoSetHtml(pillarsGrid, pillarsList.map(function(p) {
        return '<div class="pillar-box">' +
               '<div class="pillar-box-header">' +
                 '<span class="pillar-icon-dot"></span>' +
                 '<span class="pillar-title">' + escapeText(p.title) + '</span>' +
               '</div>' +
               '<p class="pillar-desc">' + escapeText(p.description) + '</p>' +
               '</div>';
      }).join(''));
    }

    // Milestones
    var milestonesListEl = document.getElementById('about-milestones-list');
    var milestonesList = Array.isArray(config.milestones) ? config.milestones : [];
    if (milestonesListEl && milestonesList.length > 0) {
      csoSetHtml(milestonesListEl, milestonesList.map(function(m) {
        return '<div class="milestone-item">' +
               '<span class="milestone-year-badge">' + escapeText(m.year) + '</span>' +
               '<div class="milestone-body">' +
                 '<div class="milestone-title">' + escapeText(m.title) + '</div>' +
                 '<p class="milestone-desc">' + escapeText(m.description) + '</p>' +
               '</div>' +
               '</div>';
      }).join(''));
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hydrateAboutMission);
  } else {
    hydrateAboutMission();
  }

  window.addEventListener('storage', function(e) {
    if (e.key === 'cso_about_config') {
      hydrateAboutMission();
    }
  });
})();
