/* Extracted from disclaimer.html for strict CSP (v151). */
/**
 * Client Hydration for Disclaimer & Statutory Notices (module-03-004)
 */
(function() {
  function escapeText(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function hydrateDisclaimer() {
    var raw = null;
    try {
      raw = localStorage.getItem('cso_disclaimer_config');
    } catch (_) {}

    var config = null;
    if (raw) {
      try {
        config = JSON.parse(raw);
      } catch (_) {}
    }

    if (!config || typeof config !== 'object') {
      config = {
        meta: { version: "2.1", updatedAt: new Date().toISOString() },
        header: {
          title: "Official Disclaimer & Non-Affiliation Notice",
          subtitle: "Statutory clarification on independent academic intelligence, third-party trademarks, and official gazette reconciliation.",
          badge: "Statutory Disclosure",
          lastReviewed: "2026-11-01"
        },
        notices: [
          { id: "DISC-01", title: "Non-Affiliation with Government Recruitment Bodies", category: "Statutory", body: "Common Sense Odisha (csodisha.com) is an independent non-governmental educational portal. It is NOT affiliated with, sponsored by, authorized by, or in any way officially connected to the Odisha Public Service Commission (OPSC), Odisha Staff Selection Commission (OSSC), Odisha Sub-Ordinate Staff Selection Commission (OSSSC), Board of Secondary Education (BSE) Odisha, or any department of the Government of Odisha.", active: true },
          { id: "DISC-02", title: "Examination Information Accuracy & Gazette Priority", category: "Accuracy", body: "All examination dates, syllabus matrices, mark weightages, and eligibility criteria published on this portal are compiled strictly for academic reference and candidate convenience. In the event of any discrepancy or conflict between the information presented here and the official notifications published in the Odisha Gazette or official commission websites, the official government gazette release shall strictly prevail.", active: true },
          { id: "DISC-03", title: "No Legal or Professional Advice", category: "Legal", body: "The contents of csodisha.com do not constitute legal, recruitment, or professional advice. Candidates are strongly advised to verify all critical eligibility criteria, qualifying relaxations, and procedural guidelines directly with official recruitment advertisements.", active: true },
          { id: "DISC-04", title: "Third-Party Trademarks & Official Logos", category: "Trademarks", body: "All trade names, trademarks, logos, and commission insignia referenced on this website remain the registered intellectual property of their respective statutory bodies. Their appearance here is purely nominative and does not imply endorsement or partnership.", active: true }
        ],
        emergencyNotice: {
          enabled: true,
          text: "Always cross-verify admit card release dates and answer keys against the primary recruitment commission portals before taking examination day actions."
        }
      };
    }

    var hdr = config.header || {};

    // Header elements
    var titleEl = document.getElementById('disclaimer-title');
    if (titleEl && hdr.title) titleEl.textContent = hdr.title;

    var subEl = document.getElementById('disclaimer-subtitle');
    if (subEl && hdr.subtitle) subEl.textContent = hdr.subtitle;

    var badgeEl = document.getElementById('disclaimer-badge');
    if (badgeEl && hdr.badge) badgeEl.textContent = hdr.badge;

    var dateEl = document.getElementById('disclaimer-last-reviewed');
    if (dateEl && hdr.lastReviewed) dateEl.textContent = hdr.lastReviewed;

    var vBadge = document.getElementById('disclaimer-version-badge');
    if (vBadge && config.meta && config.meta.version) {
      vBadge.textContent = "Version " + config.meta.version;
    }

    // Emergency advisory
    var emerg = config.emergencyNotice || {};
    var emergContainer = document.getElementById('disclaimer-emergency-container');
    var emergText = document.getElementById('disclaimer-emergency-text');
    if (emergContainer) {
      if (emerg.enabled !== false) {
        emergContainer.style.display = 'block';
        if (emergText && emerg.text) emergText.textContent = emerg.text;
      } else {
        emergContainer.style.display = 'none';
      }
    }

    // Notices List
    var noticesBox = document.getElementById('disclaimer-notices-container');
    var noticesList = Array.isArray(config.notices) ? config.notices.filter(function(n) { return n.active !== false; }) : [];
    if (noticesBox && noticesList.length > 0) {
      csoSetHtml(noticesBox, noticesList.map(function(n) {
        return '<article class="notice-card">' +
               '<div class="notice-header">' +
                 '<span class="notice-category-badge">' + escapeText(n.category || 'Statutory') + '</span>' +
                 '<h3 class="notice-title">' + escapeText(n.title || 'Notice') + '</h3>' +
               '</div>' +
               '<p class="notice-body">' + escapeText(n.body || '') + '</p>' +
               '</article>';
      }).join(''));
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hydrateDisclaimer);
  } else {
    hydrateDisclaimer();
  }

  window.addEventListener('storage', function(e) {
    if (e.key === 'cso_disclaimer_config') {
      hydrateDisclaimer();
    }
  });
})();
