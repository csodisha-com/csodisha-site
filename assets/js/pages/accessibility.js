/* Extracted from accessibility.html for strict CSP (v151). */
(function() {
  function escapeText(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function hydrateAccessibilityPolicy() {
    var raw = null;
    try {
      raw = localStorage.getItem('cso_accessibility_config');
    } catch (_) {}

    var config = null;
    if (raw) {
      try {
        config = JSON.parse(raw);
      } catch (_) {}
    }

    if (!config || typeof config !== 'object') {
      config = {
        meta: { version: "2.1", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        document: {
          title: "Web Accessibility Statement",
          standard: "WCAG 2.1 Level AA & Rights of Persons with Disabilities Act (RPwD), 2016",
          badge: "Inclusive Digital Access",
          lastAudited: "2026-11-01"
        },
        officer: {
          title: "Digital Accessibility Coordinator",
          email: "accessibility@csodisha.com",
          address: "Common Sense Odisha Academic Node, Bhubaneswar, Odisha - 751001",
          responseSlaHours: 48
        },
        features: [
          { id: "ACC-01", name: "High Contrast Theme Engine", status: "Supported", description: "Built-in dark mode and high-contrast color palette exceeding WCAG 4.5:1 ratio." },
          { id: "ACC-02", name: "Screen Reader & ARIA Semantics", status: "Supported", description: "Landmarks, breadcrumbs, modal traps, and tables structured with semantic HTML5 and ARIA 1.2 roles." },
          { id: "ACC-03", name: "Full Keyboard Navigation", status: "Supported", description: "All interactive controls, navigation trees, and modals are accessible via Tab/Shift+Tab and Enter/Esc." },
          { id: "ACC-04", name: "Bilingual Multilingual Support", status: "Partial", description: "Core syllabi and critical exam notices translated into Odia script; continuous expansion ongoing." }
        ],
        commitmentStatement: "Common Sense Odisha is committed to ensuring digital accessibility for candidates with disabilities across all 30 districts of Odisha. We continuously improve user experience for everyone."
      };
    }

    var doc = config.document || {};
    var officer = config.officer || {};

    var badgeEl = document.getElementById('access-badge');
    if (badgeEl && doc.badge) badgeEl.textContent = doc.badge;

    var vBadgeEl = document.getElementById('access-version-badge');
    if (vBadgeEl && config.meta && config.meta.version) {
      vBadgeEl.textContent = "Version " + config.meta.version;
    }

    var titleEl = document.getElementById('access-title');
    if (titleEl && doc.title) titleEl.textContent = doc.title;

    var standardEl = document.getElementById('access-standard');
    if (standardEl && doc.standard) standardEl.textContent = doc.standard;

    var dateEl = document.getElementById('access-last-audited');
    if (dateEl && doc.lastAudited) dateEl.textContent = doc.lastAudited;

    // Officer
    var offTitleEl = document.getElementById('access-officer-title');
    if (offTitleEl && officer.title) offTitleEl.textContent = officer.title;

    var offEmailEl = document.getElementById('access-officer-email');
    if (offEmailEl && officer.email) {
      offEmailEl.textContent = officer.email;
      offEmailEl.href = "mailto:" + officer.email;
    }

    var offSlaEl = document.getElementById('access-officer-sla');
    if (offSlaEl && officer.responseSlaHours) {
      offSlaEl.textContent = "Assistance within " + officer.responseSlaHours + " Hours";
    }

    var offAddressEl = document.getElementById('access-officer-address');
    if (offAddressEl && officer.address) offAddressEl.textContent = officer.address;

    // Commitment
    var commitEl = document.getElementById('access-commitment-statement');
    if (commitEl && config.commitmentStatement) commitEl.textContent = config.commitmentStatement;

    // Features
    var container = document.getElementById('access-features-container');
    var features = Array.isArray(config.features) ? config.features : [];
    if (container && features.length > 0) {
      csoSetHtml(container, features.map(function(f) {
        var statusLower = (f.status || 'supported').toLowerCase();
        return '<article class="feature-card">' +
               '  <div class="feature-header">' +
               '    <h3 class="feature-title">' + escapeText(f.name || '') + '</h3>' +
               '    <div class="feature-badge-wrap">' +
               '      <span class="feature-id">' + escapeText(f.id || '') + '</span>' +
               '      <span class="feature-status ' + statusLower + '">' + escapeText(f.status || 'Supported') + '</span>' +
               '    </div>' +
               '  </div>' +
               '  <p class="feature-desc">' + escapeText(f.description || '') + '</p>' +
               '</article>';
      }).join(''));
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hydrateAccessibilityPolicy);
  } else {
    hydrateAccessibilityPolicy();
  }

  window.addEventListener('storage', function(e) {
    if (e.key === 'cso_accessibility_config') {
      hydrateAccessibilityPolicy();
    }
  });
})();
