/* Extracted from editorial-policy.html for strict CSP (v151). */
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

  function getCategoryClass(cat) {
    if (!cat) return '';
    var c = String(cat).toLowerCase();
    if (c.indexOf('verif') !== -1 || c.indexOf('gazette') !== -1) return 'verif';
    if (c.indexOf('indep') !== -1 || c.indexOf('autonomy') !== -1) return 'indep';
    if (c.indexOf('pedagog') !== -1 || c.indexOf('access') !== -1) return 'pedagogy';
    return '';
  }

  function hydrateEditorialPolicy() {
    var raw = null;
    try {
      raw = localStorage.getItem('cso_editorial_config');
    } catch (_) {}

    var config = null;
    if (raw) {
      try {
        config = JSON.parse(raw);
      } catch (_) {}
    }

    if (!config || typeof config !== 'object') {
      config = {
        meta: { version: "1.5", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        document: { title: "Editorial Integrity & Verification Standards", badge: "Gazette-Backed Fact Checking", lastReviewed: "2026-11-01" },
        standards: [
          { id: "ED-01", title: "Dual-Source Gazette Verification", category: "Verification", body: "Every exam syllabus, eligibility cutoff, and recruitment date must be reconciled against an official government gazette or primary commission portal (OPSC, OSSC, OSSSC) before publication.", active: true },
          { id: "ED-02", title: "Non-Commercial Academic Independence", category: "Independence", body: "Our editorial staff and syllabus curators maintain complete autonomy. No sponsored coaching material or unverified promotional claims are permitted.", active: true },
          { id: "ED-03", title: "Plain Language Accessibility", category: "Pedagogy", body: "Complex recruitment notifications are translated into simplified, structured Odia and English breakdowns for equal candidate comprehension.", active: true }
        ],
        ethicsSummary: "Common Sense Odisha strictly rejects speculative clickbait, misleading recruitment dates, and unverified coaching predictions."
      };
    }

    var doc = config.document || {};

    var badgeEl = document.getElementById('editorial-badge');
    if (badgeEl && doc.badge) badgeEl.textContent = doc.badge;

    var vBadgeEl = document.getElementById('editorial-version-badge');
    if (vBadgeEl && config.meta && config.meta.version) {
      vBadgeEl.textContent = "Version " + config.meta.version;
    }

    var titleEl = document.getElementById('editorial-title');
    if (titleEl && doc.title) titleEl.textContent = doc.title;

    var dateEl = document.getElementById('editorial-last-reviewed');
    if (dateEl && doc.lastReviewed) dateEl.textContent = doc.lastReviewed;

    var ethicsEl = document.getElementById('editorial-ethics-summary');
    if (ethicsEl && config.ethicsSummary) ethicsEl.textContent = config.ethicsSummary;

    var container = document.getElementById('editorial-standards-container');
    var list = Array.isArray(config.standards) ? config.standards.filter(function(st) { return st.active !== false; }) : [];
    if (container && list.length > 0) {
      csoSetHtml(container, list.map(function(st, idx) {
        var num = idx + 1;
        var catClass = getCategoryClass(st.category);
        return '<article class="standard-card">' +
               '  <div class="standard-header">' +
               '    <div class="standard-badge-wrap">' +
               '      <span class="standard-num">#' + num + '</span>' +
               '      <span class="standard-cat ' + catClass + '">' + escapeText(st.category || 'Standards') + '</span>' +
               '    </div>' +
               '    <span class="cso-u-87e5b3ed">' + escapeText(st.id || '') + '</span>' +
               '  </div>' +
               '  <h2 class="standard-title">' + escapeText(st.title || '') + '</h2>' +
               '  <div class="standard-body cso-u-5371db16">' + escapeText(st.body || '') + '</div>' +
               '</article>';
      }).join(''));
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hydrateEditorialPolicy);
  } else {
    hydrateEditorialPolicy();
  }

  window.addEventListener('storage', function(e) {
    if (e.key === 'cso_editorial_config') {
      hydrateEditorialPolicy();
    }
  });
})();
