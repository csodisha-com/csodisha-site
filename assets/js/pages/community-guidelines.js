/* Extracted from community-guidelines.html for strict CSP (v151). */
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
    if (c.indexOf('conduct') !== -1) return 'conduct';
    if (c.indexOf('integrity') !== -1 || c.indexOf('malpractice') !== -1) return 'integrity';
    if (c.indexOf('respect') !== -1) return 'respect';
    return '';
  }

  function hydrateCommunityPolicy() {
    var raw = null;
    try {
      raw = localStorage.getItem('cso_community_config');
    } catch (_) {}

    var config = null;
    if (raw) {
      try {
        config = JSON.parse(raw);
      } catch (_) {}
    }

    if (!config || typeof config !== 'object') {
      config = {
        meta: { version: "2.0", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        document: { title: "Community Guidelines & Forum Code of Conduct", badge: "Candidate Mutual Respect", lastReviewed: "2026-11-01" },
        moderation: {
          team: "Academic Community & Forum Moderation Council",
          email: "community@csodisha.com",
          enforcementLevel: "Zero Tolerance for Hate Speech & Exam Malpractice",
          appealWindowDays: 14
        },
        rules: [
          { id: "COMM-01", number: "1", title: "Constructive Academic Discussion", category: "Conduct", description: "Discussions, comments, and study room interactions must remain strictly focused on academic preparation, syllabus doubts, and civil peer mentoring.", active: true },
          { id: "COMM-02", number: "2", title: "Zero Tolerance for Question Paper Leaks or Cheating", category: "Integrity", description: "Posting, requesting, or circulating alleged leaked question papers, examination malpractice materials, or unfair means will result in immediate permanent ban and referral to cyber authorities under the Odisha Public Examinations (Prevention of Unfair Means) Act.", active: true },
          { id: "COMM-03", number: "3", title: "No Commercial Spam or Paid Promotion", category: "Non-Commercial", description: "Promoting paid coaching batches, private Telegram links, affiliate courses, or commercial products is strictly prohibited on all portal discussion forums.", active: true },
          { id: "COMM-04", number: "4", title: "Respectful Communication & Non-Discrimination", category: "Respect", description: "Harassment, abusive language, regional discrimination, gender-based disparagement, or caste-related slurs are grounds for instant account termination.", active: true }
        ],
        reportingProcedure: "To report inappropriate forum comments, suspected unfair means, or commercial spam, click the Flag button or email community@csodisha.com with direct link and screenshot."
      };
    }

    var doc = config.document || {};
    var mod = config.moderation || {};

    var badgeEl = document.getElementById('community-badge');
    if (badgeEl && doc.badge) badgeEl.textContent = doc.badge;

    var vBadgeEl = document.getElementById('community-version-badge');
    if (vBadgeEl && config.meta && config.meta.version) {
      vBadgeEl.textContent = "Version " + config.meta.version;
    }

    var titleEl = document.getElementById('community-title');
    if (titleEl && doc.title) titleEl.textContent = doc.title;

    var dateEl = document.getElementById('community-last-reviewed');
    if (dateEl && doc.lastReviewed) dateEl.textContent = doc.lastReviewed;

    var teamEl = document.getElementById('community-team');
    if (teamEl && mod.team) teamEl.textContent = mod.team;

    var enfEl = document.getElementById('community-enforcement');
    if (enfEl && mod.enforcementLevel) enfEl.textContent = mod.enforcementLevel;

    var appealEl = document.getElementById('community-appeal-days');
    if (appealEl && mod.appealWindowDays) appealEl.textContent = mod.appealWindowDays + " Days from Notice";

    var emailEl = document.getElementById('community-email');
    if (emailEl && mod.email) {
      emailEl.textContent = mod.email;
      emailEl.href = "mailto:" + mod.email;
    }

    var repEl = document.getElementById('community-reporting-procedure');
    if (repEl && config.reportingProcedure) repEl.textContent = config.reportingProcedure;

    var container = document.getElementById('community-rules-container');
    var list = Array.isArray(config.rules) ? config.rules.filter(function(r) { return r.active !== false; }) : [];
    if (container && list.length > 0) {
      csoSetHtml(container, list.map(function(r, idx) {
        var num = r.number || (idx + 1);
        var catClass = getCategoryClass(r.category);
        return '<article class="rule-card">' +
               '  <div class="rule-header">' +
               '    <div class="rule-badge-wrap">' +
               '      <span class="rule-num">§' + num + '</span>' +
               '      <span class="rule-cat ' + catClass + '">' + escapeText(r.category || 'Conduct') + '</span>' +
               '    </div>' +
               '    <span class="cso-u-87e5b3ed">' + escapeText(r.id || '') + '</span>' +
               '  </div>' +
               '  <h2 class="rule-title">' + escapeText(r.title || '') + '</h2>' +
               '  <p class="rule-desc">' + escapeText(r.description || '') + '</p>' +
               '</article>';
      }).join(''));
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hydrateCommunityPolicy);
  } else {
    hydrateCommunityPolicy();
  }

  window.addEventListener('storage', function(e) {
    if (e.key === 'cso_community_config') {
      hydrateCommunityPolicy();
    }
  });
})();
