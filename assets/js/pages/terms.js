/* Extracted from terms.html for strict CSP (v151). */
/**
 * Client Hydration for Terms & Conditions (module-03-005)
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

  function hydrateTermsConditions() {
    var raw = null;
    try {
      raw = localStorage.getItem('cso_terms_config');
    } catch (_) {}

    var config = null;
    if (raw) {
      try {
        config = JSON.parse(raw);
      } catch (_) {}
    }

    if (!config || typeof config !== 'object') {
      config = {
        meta: { version: "2.4", updatedAt: new Date().toISOString() },
        document: {
          title: "Terms and Conditions of Use",
          version: "v2.4 (2026 Revision)",
          effectiveDate: "2026-11-01",
          governingLaw: "State of Odisha, India (Jurisdiction: High Court of Orissa / Bhubaneswar Civil Courts)"
        },
        clauses: [
          { id: "TERM-01", number: "1", title: "Acceptance of Agreement & Educational Scope", body: "By accessing or using Common Sense Odisha (csodisha.com), you agree to be bound by these Terms and Conditions. The platform operates solely as a non-profit academic intelligence and educational navigation gateway across all 30 districts of Odisha.", active: true },
          { id: "TERM-02", number: "2", title: "Intellectual Property & Fair Use", body: "Original syllabus breakdown structures, editorial notes, and portal assets are proprietary to Common Sense Odisha. State syllabus patterns and gazette releases are curated under fair dealing provisions solely for candidate guidance.", active: true },
          { id: "TERM-03", number: "3", title: "Prohibited Platform Conduct", body: "Users agree not to deploy automated scrapers, spiders, or extraction bots that burden edge server resources, nor attempt unauthorized access into administrative endpoints or authentication gates.", active: true },
          { id: "TERM-04", number: "4", title: "Statutory Non-Affiliation", body: "Common Sense Odisha is an autonomous civic platform and is NOT affiliated with, sponsored by, or endorsed by OPSC, OSSC, OSSSC, or BSE Odisha.", active: true },
          { id: "TERM-05", number: "5", title: "Limitation of Liability", body: "While every effort is made to maintain 100% gazette accuracy, candidates are strictly advised to cross-verify all critical dates, qualifying marks, and recruitment guidelines with original state notifications.", active: true }
        ],
        fairUseNotice: "All educational materials provided on csodisha.com are free for individual study and non-commercial candidate empowerment."
      };
    }

    var doc = config.document || config.terms || {};

    // Document Title
    var titleEl = document.getElementById('terms-doc-title');
    if (titleEl && doc.title) {
      titleEl.textContent = doc.title;
    }

    // Version Badge
    var vBadge = document.getElementById('terms-version-badge');
    if (vBadge && (doc.version || config.meta?.version)) {
      vBadge.textContent = "Version " + (doc.version || config.meta?.version);
    }

    // Effective Date
    var effDate = document.getElementById('terms-effective-date');
    if (effDate && doc.effectiveDate) {
      effDate.textContent = doc.effectiveDate;
    }

    // Governing Law & Jurisdiction
    var govLaw = document.getElementById('terms-governing-law');
    if (govLaw && doc.governingLaw) {
      govLaw.textContent = doc.governingLaw;
    }

    var jurEl = document.getElementById('terms-jurisdiction');
    if (jurEl && doc.governingLaw) {
      jurEl.textContent = doc.governingLaw.includes('Bhubaneswar') ? 'Odisha (Bhubaneswar)' : 'Odisha, India';
    }

    // Fair Use Notice
    var fairUse = document.getElementById('terms-fair-use-notice');
    if (fairUse && config.fairUseNotice) {
      fairUse.textContent = config.fairUseNotice;
    }

    // Clauses List
    var clausesBox = document.getElementById('terms-clauses-container');
    var clausesList = Array.isArray(config.clauses) ? config.clauses.filter(function(cl) { return cl.active !== false; }) : [];
    if (clausesBox && clausesList.length > 0) {
      csoSetHtml(clausesBox, clausesList.map(function(cl) {
        return '<article class="clause-box">' +
               '<div class="clause-header">' +
                 '<span class="clause-num-badge">§ ' + escapeText(cl.number || '1') + '</span>' +
                 '<h3 class="clause-title">' + escapeText(cl.title || 'Clause') + '</h3>' +
               '</div>' +
               '<p class="clause-body">' + escapeText(cl.body || '') + '</p>' +
               '</article>';
      }).join(''));
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hydrateTermsConditions);
  } else {
    hydrateTermsConditions();
  }

  window.addEventListener('storage', function(e) {
    if (e.key === 'cso_terms_config') {
      hydrateTermsConditions();
    }
  });
})();
