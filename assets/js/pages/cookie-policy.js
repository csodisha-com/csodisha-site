/* Extracted from cookie-policy.html for strict CSP (v151). */
/**
 * Client Hydration for Cookie Policy (module-03-006)
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

  function getCategoryClass(cat) {
    if (cat === 'Strictly Necessary') return 'cat-necessary';
    if (cat === 'Functional') return 'cat-functional';
    if (cat === 'Analytics') return 'cat-analytics';
    return 'cat-performance';
  }

  function hydrateCookiePolicy() {
    var raw = null;
    try {
      raw = localStorage.getItem('cso_cookie_config');
    } catch (_) {}

    var config = null;
    if (raw) {
      try {
        config = JSON.parse(raw);
      } catch (_) {}
    }

    if (!config || typeof config !== 'object') {
      config = {
        meta: { version: "1.2", updatedAt: new Date().toISOString() },
        banner: {
          headline: "We respect your academic privacy",
          description: "Common Sense Odisha uses minimal necessary cookies to keep your session secure and analyze aggregated edge traffic across all 30 districts of Odisha.",
          retentionDays: 365,
          enabled: true
        },
        cookies: [
          { id: "CK-01", name: "cso_admin_token", category: "Strictly Necessary", domain: "csodisha.com", duration: "2 Hours (Sliding)", purpose: "Zero-trust session anchor and authentication gate", active: true },
          { id: "CK-02", name: "cf_clearance", category: "Strictly Necessary", domain: "csodisha.com", duration: "1 Year", purpose: "Cloudflare Turnstile bot defense verification", active: true },
          { id: "CK-03", name: "cso_theme", category: "Functional", domain: "csodisha.com", duration: "Persistent", purpose: "Preserves user high-contrast dark theme preference", active: true },
          { id: "CK-04", name: "cso_telemetry_id", category: "Analytics", domain: "csodisha.com", duration: "Session", purpose: "Measures edge response latency and page performance", active: true }
        ]
      };
    }

    var b = config.banner || {};

    // Headline & Description
    var hEl = document.getElementById('cookie-headline');
    if (hEl && b.headline) hEl.textContent = b.headline;

    var dEl = document.getElementById('cookie-description');
    if (dEl && b.description) dEl.textContent = b.description;

    var rEl = document.getElementById('cookie-retention-days');
    if (rEl && b.retentionDays) rEl.textContent = b.retentionDays + " Days";

    var vBadge = document.getElementById('cookie-version-badge');
    if (vBadge && config.meta && config.meta.version) {
      vBadge.textContent = "Version " + config.meta.version;
    }

    // Cookies Table
    var tbody = document.getElementById('cookie-table-body');
    var cookiesList = Array.isArray(config.cookies) ? config.cookies.filter(function(ck) { return ck.active !== false; }) : [];
    if (tbody && cookiesList.length > 0) {
      csoSetHtml(tbody, cookiesList.map(function(ck) {
        var catClass = getCategoryClass(ck.category);
        return '<tr>' +
               '<td><span class="cookie-key-code">' + escapeText(ck.name || '') + '</span></td>' +
               '<td><span class="cat-badge ' + catClass + '">' + escapeText(ck.category || 'Functional') + '</span></td>' +
               '<td>' + escapeText(ck.domain || 'csodisha.com') + '</td>' +
               '<td>' + escapeText(ck.duration || 'Session') + '</td>' +
               '<td>' + escapeText(ck.purpose || '') + '</td>' +
               '</tr>';
      }).join(''));
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hydrateCookiePolicy);
  } else {
    hydrateCookiePolicy();
  }

  window.addEventListener('storage', function(e) {
    if (e.key === 'cso_cookie_config') {
      hydrateCookiePolicy();
    }
  });
})();
