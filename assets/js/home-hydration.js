/* Common Sense Odisha — Homepage Live Feed, Broadcast Ticker & Config Hydration (v332, Strict CSP)
 * Dynamically hydrates ALL 7 Admin "+ Create New" content types from GET /api/public/home-feed:
 *   1. Top Homepage Broadcast Ticker (EN/OR + badge + CTA)
 *   2. Latest Job Alerts & Admit Cards
 *   3. Daily Current Affairs (Odisha & National)
 *   4. Live CBT Mock Tests
 *   5. Latest Syllabus & Previous Year Papers (PYQ)
 *   6. Career Roadmaps & Pay Bands
 *   7. Government Schemes & Scholarships
 * Static fallback markup in index.html stays untouched whenever any D1 bucket is empty.
 * Strict CSP: DOM nodes built safely via createElement / textContent / replaceChildren only.
 */
(function () {
  'use strict';

  var SEV_CLASS = {
    info: 'cso-live-banner cso-live-banner--info',
    notice: 'cso-live-banner cso-live-banner--notice',
    urgent: 'cso-live-banner cso-live-banner--urgent'
  };
  var SEV_TAG = { info: 'NOTICE', notice: 'NOTICE', urgent: 'URGENT' };
  var lastFeed = null;

  function make(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null && text !== '') n.textContent = String(text);
    return n;
  }

  function safeHref(raw) {
    var u = String(raw || '').trim();
    if (!u) return '';
    if (/^\/(?!\/)/.test(u) || /^https?:\/\//i.test(u)) return u;
    return '';
  }

  function isOdiaActive() {
    try {
      if (document.documentElement.getAttribute('lang') === 'or') return true;
      if (localStorage.getItem('cso_lang_pref') === 'or') return true;
      if (localStorage.getItem('cso_lang') === 'or') return true;
    } catch (_) {}
    return false;
  }

  function pickBi(enVal, orVal, fallback) {
    var orTxt = String(orVal || '').trim();
    var enTxt = String(enVal || '').trim();
    if (isOdiaActive() && orTxt) return orTxt;
    return enTxt || orTxt || String(fallback || '');
  }

  function formatShortDate(raw) {
    var s = String(raw || '').trim();
    if (!s) return '';
    var m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return s.slice(0, 16);
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var mo = months[Number(m[2]) - 1] || m[2];
    return m[3] + ' ' + mo + ' ' + m[1];
  }

  function truncate(text, max) {
    var s = String(text || '').replace(/\s+/g, ' ').trim();
    if (!s || s.length <= max) return s;
    return s.slice(0, max - 1).trim() + '\u2026';
  }

  function makeLink(cls, text, href, external) {
    var a = make('a', cls, text);
    var clean = safeHref(href) || '/';
    a.setAttribute('href', clean);
    if (external && /^https?:\/\//i.test(clean) && clean.indexOf(window.location.origin) !== 0) {
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
    }
    return a;
  }

  /* 1. Top Homepage Broadcast Ticker */
  function renderLiveBanner(data) {
    var mount = document.getElementById('csoPublicAnnouncementMount');
    if (!mount) return;
    mount.textContent = '';
    if (!data || !data.active || !data.headline) return;
    var key = 'cso_dismissed_announcement_' + (data.updatedAt || data.headline);
    try { if (sessionStorage.getItem(key)) return; } catch (_) {}

    var sev = SEV_CLASS[data.severity] ? data.severity : 'info';
    var bar = make('div', SEV_CLASS[sev]);
    bar.id = 'csoLiveBanner';
    bar.setAttribute('role', 'status');

    var left = make('div', 'cso-live-banner__left');
    var badgeTxt = (data.badge_label && String(data.badge_label).trim()) || SEV_TAG[sev];
    left.appendChild(make('span', 'cso-live-banner__tag', badgeTxt));

    var headlineTxt = pickBi(data.headline, data.headline_or);
    var contextTxt = pickBi(data.context, data.context_or);
    left.appendChild(make('strong', 'cso-live-banner__headline', headlineTxt));
    if (contextTxt) left.appendChild(make('span', 'cso-live-banner__context', contextTxt));

    var ctaUrl = safeHref(data.ctaUrl);
    if (data.ctaText && ctaUrl) {
      var cta = makeLink('cso-live-banner__cta', data.ctaText + ' \u2192', ctaUrl, true);
      left.appendChild(cta);
    }

    var close = make('button', 'cso-live-banner__close', '\u00d7');
    close.type = 'button';
    close.setAttribute('title', 'Dismiss');
    close.setAttribute('aria-label', 'Dismiss announcement');
    close.addEventListener('click', function () {
      bar.remove();
      try { sessionStorage.setItem(key, 'true'); } catch (_) {}
    });

    bar.appendChild(left);
    bar.appendChild(close);
    mount.appendChild(bar);
  }

  /* 2. Latest Job Alerts & Admit Cards */
  function renderJobsSection(jobs) {
    var grid = document.getElementById('cso-home-jobs-grid');
    if (!grid || !Array.isArray(jobs) || !jobs.length) return;
    var isOr = isOdiaActive();
    var frag = document.createDocumentFragment();
    jobs.slice(0, 6).forEach(function (job) {
      var card = make('article', 'cso-hf-card');
      var badges = make('div', 'cso-hf-badges');
      if (job.category) badges.appendChild(make('span', 'cso-hf-badge cso-hf-badge--accent', job.category));
      if (job.district) badges.appendChild(make('span', 'cso-hf-badge cso-hf-badge--ok', job.district));
      if (job.last_date) {
        badges.appendChild(make('span', 'cso-hf-badge cso-hf-badge--warn', (isOr ? 'ଶେଷ ତାରିଖ: ' : 'Last Date: ') + formatShortDate(job.last_date)));
      }
      card.appendChild(badges);

      var href = safeHref(job.href) || ('/jobs/' + encodeURIComponent(job.slug || job.id || ''));
      var h3 = make('h3', 'cso-hf-card__title');
      h3.appendChild(makeLink('cso-hf-card__link', pickBi(job.title_en, job.title_or, 'Job Notification'), href, false));
      card.appendChild(h3);

      var subLine = job.qualification || job.organisation_en || '';
      if (subLine) card.appendChild(make('p', 'cso-hf-card__desc', truncate(subLine, 120)));

      var foot = make('div', 'cso-hf-card__foot');
      var vacText = Number(job.vacancies || 0) > 0
        ? (Number(job.vacancies).toLocaleString('en-IN') + (isOr ? ' ପଦବୀ' : ' Vacancies'))
        : (job.organisation_en || (isOr ? 'ସରକାରୀ ବିଜ୍ଞପ୍ତି' : 'Official Notice'));
      foot.appendChild(make('span', 'cso-hf-meta', vacText));
      foot.appendChild(makeLink('cso-hf-btn', isOr ? 'ବିବରଣୀ ଦେଖନ୍ତୁ \u2192' : 'View Details \u2192', href, false));
      card.appendChild(foot);
      frag.appendChild(card);
    });
    grid.replaceChildren(frag);
  }

  /* 3. Daily Current Affairs (Odisha & National) */
  function renderCurrentAffairsSection(items) {
    var grid = document.getElementById('cso-home-ca-grid');
    if (!grid || !Array.isArray(items) || !items.length) return;
    var isOr = isOdiaActive();
    var frag = document.createDocumentFragment();
    items.slice(0, 5).forEach(function (ca) {
      var card = make('article', 'cso-hf-card');
      var badges = make('div', 'cso-hf-badges');
      if (ca.date) badges.appendChild(make('span', 'cso-hf-badge cso-hf-badge--info', formatShortDate(ca.date)));
      if (ca.category) badges.appendChild(make('span', 'cso-hf-badge cso-hf-badge--accent', ca.category));
      if (Number(ca.quiz_count || 0) > 0) {
        badges.appendChild(make('span', 'cso-hf-badge cso-hf-badge--ok', String(ca.quiz_count) + ' MCQs'));
      }
      card.appendChild(badges);

      var href = safeHref(ca.href) || ('/current-affairs/' + encodeURIComponent(ca.slug || ca.id || ''));
      var h3 = make('h3', 'cso-hf-card__title');
      h3.appendChild(makeLink('cso-hf-card__link', pickBi(ca.title_en, ca.title_or, 'Current Affairs Update'), href, false));
      card.appendChild(h3);

      var sum = pickBi(ca.summary_en, ca.summary_or);
      if (sum) card.appendChild(make('p', 'cso-hf-card__desc', truncate(sum, 140)));

      var foot = make('div', 'cso-hf-card__foot');
      var metaTxt = Number(ca.highlights_count || 0) > 0
        ? (String(ca.highlights_count) + (isOr ? ' ମୁଖ୍ୟ ଅଂଶ' : ' Key Points'))
        : (isOr ? 'ଦୈନିକ ସମ୍ବାଦ' : 'Daily Brief');
      foot.appendChild(make('span', 'cso-hf-meta', metaTxt));
      foot.appendChild(makeLink('cso-hf-btn', isOr ? 'ପଢ଼ନ୍ତୁ \u2192' : 'Read Brief \u2192', href, false));
      card.appendChild(foot);
      frag.appendChild(card);
    });
    grid.replaceChildren(frag);
  }

  /* 4. Live CBT Mock Tests */
  function renderMockTestsSection(tests) {
    var grid = document.getElementById('cso-home-mocks-grid');
    if (!grid || !Array.isArray(tests) || !tests.length) return;
    var isOr = isOdiaActive();
    var frag = document.createDocumentFragment();
    tests.slice(0, 4).forEach(function (t) {
      var card = make('article', 'cso-hf-card');
      var badges = make('div', 'cso-hf-badges');
      if (t.exam_category) badges.appendChild(make('span', 'cso-hf-badge cso-hf-badge--accent', t.exam_category));
      if (Number(t.duration_minutes || 0) > 0) {
        badges.appendChild(make('span', 'cso-hf-badge cso-hf-badge--info', String(t.duration_minutes) + ' min'));
      }
      if (Number(t.negative_marking || 0) > 0) {
        badges.appendChild(make('span', 'cso-hf-badge cso-hf-badge--warn', '-' + String(t.negative_marking) + ' Negative'));
      }
      card.appendChild(badges);

      var href = safeHref(t.href) || ('/mock-tests/?test=' + encodeURIComponent(t.slug || t.id || ''));
      var h3 = make('h3', 'cso-hf-card__title');
      h3.appendChild(makeLink('cso-hf-card__link', pickBi(t.title_en, t.title_or, 'CBT Mock Test'), href, false));
      card.appendChild(h3);

      var foot = make('div', 'cso-hf-card__foot');
      var qCount = Number(t.question_count || 0);
      var metaTxt = qCount > 0
        ? (String(qCount) + (isOr ? ' ପ୍ରଶ୍ନ' : ' Questions'))
        : (isOr ? 'ଅନଲାଇନ୍ CBT ପରୀକ୍ଷା' : 'Online CBT Exam');
      foot.appendChild(make('span', 'cso-hf-meta', metaTxt));
      foot.appendChild(makeLink('cso-hf-btn cso-hf-btn--primary', isOr ? 'ପରୀକ୍ଷା ଆରମ୍ଭ କରନ୍ତୁ \u2192' : 'Start Test \u2192', href, false));
      card.appendChild(foot);
      frag.appendChild(card);
    });
    grid.replaceChildren(frag);
  }

  /* 5. Latest Syllabus & Previous Year Papers (PYQ) */
  function renderSyllabusSection(items) {
    var grid = document.getElementById('cso-home-syllabus-grid');
    if (!grid || !Array.isArray(items) || !items.length) return;
    var isOr = isOdiaActive();
    var frag = document.createDocumentFragment();
    items.slice(0, 6).forEach(function (res) {
      var card = make('article', 'cso-hf-card');
      var badges = make('div', 'cso-hf-badges');
      if (res.exam_tag) badges.appendChild(make('span', 'cso-hf-badge cso-hf-badge--info', res.exam_tag));
      if (res.year) badges.appendChild(make('span', 'cso-hf-badge cso-hf-badge--ok', String(res.year)));
      if (res.resource_type) badges.appendChild(make('span', 'cso-hf-badge', res.resource_type));
      card.appendChild(badges);

      var viewHref = safeHref(res.view_url) || '/study-library/';
      var pdfHref = safeHref(res.pdf_url);
      var h3 = make('h3', 'cso-hf-card__title');
      h3.appendChild(makeLink('cso-hf-card__link', pickBi(res.title_en, res.title_or, 'Syllabus / PYQ Resource'), viewHref, false));
      card.appendChild(h3);

      var sum = pickBi(res.summary_en, res.summary_or);
      if (sum) card.appendChild(make('p', 'cso-hf-card__desc', truncate(sum, 115)));

      var foot = make('div', 'cso-hf-card__foot');
      foot.appendChild(make('span', 'cso-hf-meta', pdfHref ? 'PDF Ready' : (isOr ? 'ଅଧ୍ୟୟନ ସାମଗ୍ରୀ' : 'Study Resource')));
      var actions = make('div', 'cso-hf-actions');
      if (pdfHref) {
        var dl = makeLink('cso-hf-btn cso-hf-btn--primary', isOr ? 'PDF ଡାଉନଲୋଡ୍' : 'Download PDF', pdfHref, true);
        dl.setAttribute('target', '_blank');
        dl.setAttribute('rel', 'noopener noreferrer');
        actions.appendChild(dl);
      }
      actions.appendChild(makeLink('cso-hf-btn' + (pdfHref ? '' : ' cso-hf-btn--primary'), isOr ? 'ଦେଖନ୍ତୁ' : 'View', viewHref, false));
      foot.appendChild(actions);
      card.appendChild(foot);
      frag.appendChild(card);
    });
    grid.replaceChildren(frag);
  }

  /* 6. Career Roadmaps & Pay Bands */
  function renderCareersSection(items) {
    var grid = document.getElementById('cso-home-careers-grid');
    if (!grid || !Array.isArray(items) || !items.length) return;
    var isOr = isOdiaActive();
    var frag = document.createDocumentFragment();
    items.slice(0, 4).forEach(function (car) {
      var card = make('article', 'cso-hf-card');
      var badges = make('div', 'cso-hf-badges');
      if (car.eligibility) badges.appendChild(make('span', 'cso-hf-badge cso-hf-badge--ok', truncate(car.eligibility, 42)));
      if (car.pay_band) badges.appendChild(make('span', 'cso-hf-badge cso-hf-badge--accent', truncate(car.pay_band, 42)));
      card.appendChild(badges);

      var href = safeHref(car.href) || ('/careers/' + encodeURIComponent(car.slug || car.id || ''));
      var h3 = make('h3', 'cso-hf-card__title');
      h3.appendChild(makeLink('cso-hf-card__link', pickBi(car.title_en, car.title_or, 'Career Roadmap'), href, false));
      card.appendChild(h3);

      var sum = pickBi(car.summary_en, car.summary_or);
      if (sum) card.appendChild(make('p', 'cso-hf-card__desc', truncate(sum, 130)));

      var foot = make('div', 'cso-hf-card__foot');
      foot.appendChild(make('span', 'cso-hf-meta', car.career_stage || (isOr ? 'କ୍ୟାରିୟର ମାର୍ଗଦର୍ଶନ' : 'Career Guide')));
      foot.appendChild(makeLink('cso-hf-btn', isOr ? 'ରୋଡମ୍ୟାପ୍ ଦେଖନ୍ତୁ \u2192' : 'View Roadmap \u2192', href, false));
      card.appendChild(foot);
      frag.appendChild(card);
    });
    grid.replaceChildren(frag);
  }

  /* 7. Latest Government Schemes & Scholarships */
  function renderSchemesSection(items) {
    var grid = document.getElementById('cso-home-schemes-grid');
    if (!grid || !Array.isArray(items) || !items.length) return;
    var isOr = isOdiaActive();
    var frag = document.createDocumentFragment();
    items.slice(0, 4).forEach(function (sch) {
      var card = make('article', 'cso-hf-card');
      var badges = make('div', 'cso-hf-badges');
      if (sch.department) badges.appendChild(make('span', 'cso-hf-badge cso-hf-badge--ok', truncate(sch.department, 38)));
      if (sch.is_ongoing) badges.appendChild(make('span', 'cso-hf-badge cso-hf-badge--info', isOr ? 'ଚାଲୁ ଅଛି' : 'Ongoing'));
      else if (sch.last_date) badges.appendChild(make('span', 'cso-hf-badge cso-hf-badge--warn', formatShortDate(sch.last_date)));
      card.appendChild(badges);

      var href = safeHref(sch.href) || ('/schemes/' + encodeURIComponent(sch.slug || sch.id || ''));
      var h3 = make('h3', 'cso-hf-card__title');
      h3.appendChild(makeLink('cso-hf-card__link', pickBi(sch.title_en, sch.title_or, 'Government Scheme'), href, false));
      card.appendChild(h3);

      var sum = pickBi(sch.benefit_summary || sch.summary_en, sch.summary_or);
      if (sum) card.appendChild(make('p', 'cso-hf-card__desc', truncate(sum, 130)));

      var foot = make('div', 'cso-hf-card__foot');
      foot.appendChild(make('span', 'cso-hf-meta', isOr ? 'ସରକାରୀ ଯୋଜନା' : 'Verified Scheme'));
      foot.appendChild(makeLink('cso-hf-btn', isOr ? 'ଯୋଗ୍ୟତା ଦେଖନ୍ତୁ \u2192' : 'View Scheme \u2192', href, false));
      card.appendChild(foot);
      frag.appendChild(card);
    });
    grid.replaceChildren(frag);
  }

  /* 8. Unified Latest Updates Card with Working 6-Tab Filtering (v337) */
  var activeLuTab = 'all';
  var luTabsBound = false;

  var LU_BADGE_CLASS = {
    JOB: 'cso-lu-badge cso-lu-badge--job',
    EXAM: 'cso-lu-badge cso-lu-badge--exam',
    SCHEME: 'cso-lu-badge cso-lu-badge--scheme',
    STUDY: 'cso-lu-badge cso-lu-badge--study',
    'CURRENT AFFAIRS': 'cso-lu-badge cso-lu-badge--ca',
    CAREER: 'cso-lu-badge cso-lu-badge--career',
    COMMUNITY: 'cso-lu-badge cso-lu-badge--community'
  };

  function getLatestUpdatesItems(feed) {
    if (feed && Array.isArray(feed.latest_updates) && feed.latest_updates.length) {
      return feed.latest_updates;
    }
    var fallback = [];
    (feed && feed.mock_tests || []).slice(0, 2).forEach(function (m) {
      fallback.push({
        id: 'mock_test:' + (m.id || m.slug),
        title_en: m.title_en,
        title_or: m.title_or,
        url: m.href || '/mock-tests/',
        badge_type: 'EXAM',
        filter_tags: ['all', 'exams', 'education', 'odisha'],
        meta_line: [m.exam_category || 'CBT Mock Test', (m.duration_minutes ? (m.duration_minutes + ' min') : '') + (m.question_count ? (' • ' + m.question_count + ' Qs') : '')].filter(Boolean).join(' • '),
        cta_label: 'Start Test →',
        is_external: false,
        is_pinned: false
      });
    });
    (feed && feed.jobs || []).slice(0, 3).forEach(function (j) {
      fallback.push({
        id: 'job:' + (j.id || j.slug),
        title_en: j.title_en,
        title_or: j.title_or,
        url: j.href || ('/jobs/' + encodeURIComponent(j.slug || '')),
        badge_type: 'JOB',
        filter_tags: ['all', 'jobs', 'exams', 'odisha'],
        meta_line: [j.organisation_en || j.category || 'Odisha Govt', j.last_date ? ('Last Date: ' + formatShortDate(j.last_date)) : (j.district || 'All Odisha')].filter(Boolean).join(' • '),
        cta_label: 'View Job →',
        is_external: false,
        is_pinned: false
      });
    });
    (feed && feed.schemes || []).slice(0, 2).forEach(function (s) {
      fallback.push({
        id: 'scheme:' + (s.id || s.slug),
        title_en: s.title_en,
        title_or: s.title_or,
        url: s.href || ('/schemes/' + encodeURIComponent(s.slug || '')),
        badge_type: 'SCHEME',
        filter_tags: ['all', 'schemes', 'odisha'],
        meta_line: [s.department || 'Govt. of Odisha', s.is_ongoing ? 'Ongoing' : formatShortDate(s.last_date)].filter(Boolean).join(' • '),
        cta_label: 'Check Scheme →',
        is_external: false,
        is_pinned: false
      });
    });
    (feed && feed.current_affairs || []).slice(0, 2).forEach(function (c) {
      fallback.push({
        id: 'ca:' + (c.id || c.slug),
        title_en: c.title_en,
        title_or: c.title_or,
        url: c.href || ('/current-affairs/' + encodeURIComponent(c.slug || '')),
        badge_type: 'CURRENT AFFAIRS',
        filter_tags: ['all', 'education', /national/i.test(c.category || '') ? 'national' : 'odisha'],
        meta_line: [formatShortDate(c.date), c.category || 'Odisha'].filter(Boolean).join(' • '),
        cta_label: 'Read Brief →',
        is_external: false,
        is_pinned: false
      });
    });
    (feed && feed.syllabus_pyq || []).slice(0, 2).forEach(function (r) {
      fallback.push({
        id: 'study:' + (r.id || r.slug),
        title_en: r.title_en,
        title_or: r.title_or,
        url: r.view_url || '/study-library/',
        badge_type: 'STUDY',
        filter_tags: ['all', 'education', 'odisha'],
        meta_line: [r.exam_tag || 'Study Library', r.year || r.resource_type || 'Syllabus'].filter(Boolean).join(' • '),
        cta_label: 'Read Guide →',
        is_external: false,
        is_pinned: false
      });
    });
    return fallback;
  }

  function localizeLuTabLabels() {
    var panel = document.querySelector('.lu');
    if (!panel) return;
    var isOr = isOdiaActive();
    var titleEl = panel.querySelector('.cso-lu-title');
    if (titleEl) {
      titleEl.replaceChildren();
      var ico = make('span', '', '\uD83D\uDD14');
      ico.setAttribute('aria-hidden', 'true');
      titleEl.appendChild(ico);
      titleEl.appendChild(document.createTextNode(isOr ? ' ସର୍ବଶେଷ ଅପଡେଟ୍' : ' Latest Updates'));
    }
    var viewAllEl = panel.querySelector('.cso-lu-viewall');
    if (viewAllEl) viewAllEl.textContent = isOr ? 'ସବୁ ଦେଖନ୍ତୁ →' : 'View All →';

    var labels = isOr
      ? { all: 'ସମସ୍ତ', jobs: 'ଚାକିରି', exams: 'ପରୀକ୍ଷା', schemes: 'ଯୋଜନା', education: 'ଶିକ୍ଷା', odisha: 'ଓଡ଼ିଶା', national: 'ଜାତୀୟ' }
      : { all: 'All', jobs: 'Jobs', exams: 'Exams', schemes: 'Schemes', education: 'Education', odisha: 'Odisha', national: 'National' };
    panel.querySelectorAll('.tabs button').forEach(function (btn) {
      var tabKey = String(btn.getAttribute('data-filter') || btn.getAttribute('data-tab') || btn.getAttribute('data-category') || 'all').toLowerCase();
      if (labels[tabKey]) btn.textContent = labels[tabKey];
    });
  }

  function filterStaticFallbackLuItems(tabKey) {
    var listHost = document.getElementById('cso-lu-list');
    if (!listHost) return;
    var cards = listHost.querySelectorAll('.cso-lu-fallback');
    if (!cards.length) return;
    cards.forEach(function (card) {
      var tags = String(card.getAttribute('data-tags') || 'all').toLowerCase().split(/\s+/);
      var visible = !tabKey || tabKey === 'all' || tags.indexOf(tabKey) !== -1;
      card.hidden = !visible;
    });
  }

  function bindLatestUpdatesTabs() {
    var panel = document.querySelector('.lu');
    if (!panel || luTabsBound) return;
    var tabBar = panel.querySelector('.tabs');
    if (!tabBar) return;
    luTabsBound = true;

    tabBar.addEventListener('click', function (ev) {
      var btn = ev.target && ev.target.closest ? ev.target.closest('button[role="tab"], button') : null;
      if (!btn || !tabBar.contains(btn)) return;
      ev.preventDefault();
      ev.stopImmediatePropagation();
      activeLuTab = String(btn.getAttribute('data-filter') || btn.getAttribute('data-tab') || btn.getAttribute('data-category') || 'all').toLowerCase();
      tabBar.querySelectorAll('button').forEach(function (b) {
        var isAct = b === btn;
        b.classList.toggle('a', isAct);
        b.setAttribute('aria-selected', String(isAct));
        b.setAttribute('aria-pressed', String(isAct));
      });
      if (lastFeed && getLatestUpdatesItems(lastFeed).length) {
        renderLatestUpdatesPanel(lastFeed);
      } else {
        filterStaticFallbackLuItems(activeLuTab);
      }
    }, true);

    tabBar.addEventListener('keydown', function (ev) {
      if (ev.key !== 'ArrowRight' && ev.key !== 'ArrowLeft') return;
      var btns = Array.prototype.slice.call(tabBar.querySelectorAll('button'));
      var idx = btns.indexOf(document.activeElement);
      if (idx < 0 || !btns.length) return;
      ev.preventDefault();
      var next = btns[(idx + (ev.key === 'ArrowRight' ? 1 : btns.length - 1)) % btns.length];
      next.focus();
      next.click();
    });
  }

  function renderLatestUpdatesPanel(feed) {
    var panel = document.querySelector('.lu');
    if (!panel) return;
    var items = getLatestUpdatesItems(feed);

    // Ensure clean list container (remove any legacy ticker windows created before feed arrived)
    panel.classList.remove('cso-ticker-active');
    panel.querySelectorAll('.cso-ticker-window').forEach(function (x) { x.remove(); });
    var listHost = document.getElementById('cso-lu-list');
    if (!listHost) {
      listHost = make('div', 'cso-lu-list');
      listHost.id = 'cso-lu-list';
      listHost.setAttribute('aria-live', 'polite');
      panel.appendChild(listHost);
    }

    window.__CSO_LU_HYDRATED__ = true;
    bindLatestUpdatesTabs();
    localizeLuTabLabels();

    var isOr = isOdiaActive();
    var filtered = items.filter(function (it) {
      if (!activeLuTab || activeLuTab === 'all') return true;
      var tags = Array.isArray(it.filter_tags) ? it.filter_tags : [];
      return tags.indexOf(activeLuTab) !== -1;
    });

    if (!filtered.length) {
      // If D1 returned 0 items total, keep static fallback cards visible & filtered
      if (!items.length && listHost.querySelector('.cso-lu-fallback')) {
        filterStaticFallbackLuItems(activeLuTab);
        return;
      }
      var emptyMsg = items.length
        ? (isOr ? 'ଏହି ବର୍ଗରେ ଏବେ କୌଣସି ପ୍ରକାଶିତ ଅପଡେଟ୍ ନାହିଁ।' : 'No published updates in this tab yet — check All or other sections.')
        : (isOr ? 'ଏପର୍ଯ୍ୟନ୍ତ କୌଣସି ଅପଡେଟ୍ ପ୍ରକାଶିତ ହୋଇନାହିଁ।' : 'No items published yet — publish content in Admin Studio.');
      var emptyRow = make('div', 'it cso-lu-empty');
      emptyRow.appendChild(make('div', '', emptyMsg));
      listHost.replaceChildren(emptyRow);
      return;
    }

    var frag = document.createDocumentFragment();
    filtered.slice(0, 5).forEach(function (u) {
      var row = make('article', 'cso-lu-item');
      var topMeta = make('div', 'cso-lu-item-top');
      var badgeType = String(u.badge_type || 'JOB').toUpperCase();
      topMeta.appendChild(make('span', LU_BADGE_CLASS[badgeType] || 'cso-lu-badge', badgeType));
      if (u.is_pinned) {
        topMeta.appendChild(make('span', 'cso-lu-pin-chip', isOr ? '📌 ପିନ୍' : '📌 Pinned'));
      }
      var href = safeHref(u.url) || '/jobs/';
      var ctaText = String(u.cta_label || (u.is_external ? 'Official Source ↗' : 'View Details →'));
      var ctaLink = makeLink('cso-lu-cta' + (u.is_external ? ' cso-lu-cta--ext' : ''), ctaText, href, Boolean(u.is_external));
      topMeta.appendChild(ctaLink);
      row.appendChild(topMeta);

      var titleLink = makeLink('cso-lu-item-title', pickBi(u.title_en, u.title_or, 'Update'), href, Boolean(u.is_external));
      row.appendChild(titleLink);

      if (u.meta_line) {
        row.appendChild(make('div', 'cso-lu-item-meta', u.meta_line));
      }
      frag.appendChild(row);
    });
    listHost.replaceChildren(frag);
  }

  function renderAllFromFeed(feed) {
    if (!feed) return;
    lastFeed = feed;
    window.__CSO_HOME_FEED__ = feed;
    if (feed.broadcast) renderLiveBanner(feed.broadcast);
    renderLatestUpdatesPanel(feed);
    renderJobsSection(feed.jobs);
    renderCurrentAffairsSection(feed.current_affairs);
    renderMockTestsSection(feed.mock_tests);
    renderSyllabusSection(feed.syllabus_pyq);
    renderCareersSection(feed.careers);
    renderSchemesSection(feed.schemes);
  }

  function buildFeedUrl(forceBust) {
    var bustTs = '';
    try {
      var stored = localStorage.getItem('cso_home_feed_bust');
      if (stored && (Date.now() - Number(stored) < 180000)) {
        bustTs = stored;
      }
    } catch (_) {}
    var hasQueryBust = /[?&](refresh|_cb)=/.test(window.location.search || '');
    if (forceBust || hasQueryBust || bustTs) {
      return '/api/public/home-feed?refresh=1&_cb=' + encodeURIComponent(bustTs || String(Date.now()));
    }
    return '/api/public/home-feed';
  }

  function mountHomeFeed(forceBust) {
    var isHome = Boolean(document.getElementById('cso-home-jobs-grid'));
    if (!isHome) {
      // Subpages still hydrate the top live announcement ticker
      fetch('/api/content/banner', { credentials: 'same-origin' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) { if (d) renderLiveBanner(d); })
        .catch(function () {});
      return;
    }

    var url = buildFeedUrl(forceBust);
    var fetchOpts = { credentials: 'same-origin' };
    if (url.indexOf('_cb=') !== -1) fetchOpts.cache = 'no-store';

    fetch(url, fetchOpts)
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (feed) {
        if (feed && feed.ok) renderAllFromFeed(feed);
      })
      .catch(function () {
        // Fallback to standalone banner if home-feed temporarily fails
        fetch('/api/content/banner', { credentials: 'same-origin' })
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (d) { if (d) renderLiveBanner(d); })
          .catch(function () {});
      });
  }

  function hydrateHomepageConfig() {
    try {
      var raw = localStorage.getItem('cso_homepage_config');
      if (!raw) return;
      var config = JSON.parse(raw);
      if (!config) return;

      if (config.hero) {
        var heroSec = document.getElementById('cso-hero');
        if (heroSec) heroSec.classList.toggle('cso-hidden', config.hero.enabled === false);
        if (config.hero.tagline) {
          var tagEl = document.querySelector('.cso-hero-tagline');
          if (tagEl) tagEl.textContent = config.hero.tagline;
        }
        if (config.hero.subheadline) {
          var subEl = document.querySelector('.cso-hero-subtagline');
          if (subEl) subEl.textContent = config.hero.subheadline;
        }
      }

      if (Array.isArray(config.sections)) {
        config.sections.forEach(function (sec) {
          if (sec.id === 'sec-badges') {
            var chips = document.querySelector('.chips');
            if (chips) chips.classList.toggle('cso-hidden', !sec.enabled);
          } else if (sec.id === 'sec-notice') {
            var bannerMount = document.getElementById('csoPublicAnnouncementMount');
            if (bannerMount) bannerMount.classList.toggle('cso-hidden', !sec.enabled);
          }
        });
      }
    } catch (err) {
      console.warn('Homepage hydration error:', err);
    }
  }

  function bindLiveEvents() {
    // Re-render immediately when user switches language pills (English / ଓଡ଼ିଆ)
    document.addEventListener('click', function (ev) {
      var pill = ev.target && ev.target.closest ? ev.target.closest('[data-cso-lang], [data-lang]') : null;
      if (pill) {
        setTimeout(function () {
          localizeHeroCopy();
          if (lastFeed) renderAllFromFeed(lastFeed);
        }, 60);
      }
    });

    // Cross-tab instant sync when Admin Studio publishes an item
    window.addEventListener('storage', function (e) {
      if (e.key === 'cso_homepage_config') hydrateHomepageConfig();
      if (e.key === 'cso_home_feed_bust') mountHomeFeed(true);
      if (e.key === 'cso_lang_pref' || e.key === 'cso_lang') {
        localizeHeroCopy();
        if (lastFeed) renderAllFromFeed(lastFeed);
      }
    });

    if (typeof window.BroadcastChannel === 'function') {
      try {
        var ch = new BroadcastChannel('cso-publish-sync');
        ch.addEventListener('message', function (ev) {
          if (ev && ev.data && ev.data.type === 'published') mountHomeFeed(true);
        });
      } catch (_) {}
    }
  }

  function localizeHeroCopy() {
    var isOr = isOdiaActive();
    var inp = document.getElementById('cso-ask-input');
    if (inp) {
      inp.placeholder = isOr
        ? 'ଓଡ଼ିଆ କିମ୍ବା ଇଂରାଜୀରେ ପଚାରନ୍ତୁ — ଚାକିରି, ଯୋଜନା, ସିଲାବସ୍, OPSC, ବୃତ୍ତି...'
        : 'Ask CSOdisha in EN or ଓଡ଼ିଆ — jobs, schemes, syllabus, OPSC, scholarships...';
    }
    var askLbl = document.querySelector('#cso-hero-ask-btn .cso-hero-ask-label');
    if (askLbl && !(document.getElementById('cso-hero-ask-btn') && document.getElementById('cso-hero-ask-btn').disabled)) {
      askLbl.textContent = isOr ? '✨ ପଚାରନ୍ତୁ' : '✨ Ask';
    }
    var clr = document.getElementById('cso-hero-clear');
    if (clr) clr.textContent = isOr ? '✕ ସଫା କରନ୍ତୁ' : '✕ Clear';
    var chipsLbl = document.getElementById('chips-label');
    if (chipsLbl) chipsLbl.textContent = isOr ? 'ଲୋକପ୍ରିୟ ସନ୍ଧାନ:' : 'Popular Searches:';

    var trustStrip = document.getElementById('cso-hero-trust-strip');
    if (trustStrip) {
      var trustTexts = isOr
        ? ['୩୦ ଓଡ଼ିଶା ଜିଲ୍ଲା', 'ଦ୍ୱିଭାଷୀ EN / ଓଡ଼ିଆ', 'ଯାଞ୍ଚିତ .gov.in ପୋର୍ଟାଲ୍']
        : ['30 Odisha Districts', 'Bilingual EN / ଓଡ଼ିଆ', 'Verified .gov.in Portals'];
      trustStrip.querySelectorAll('[data-trust-idx]').forEach(function (node) {
        var idx = Number(node.getAttribute('data-trust-idx'));
        if (trustTexts[idx]) node.textContent = trustTexts[idx];
      });
    }
  }

  function removeOpportunityCompass() {
    document.querySelectorAll('#cso-opportunity-compass, .cso-compass-section').forEach(function (node) {
      node.remove();
    });
  }

  function init() {
    removeOpportunityCompass();
    localizeHeroCopy();
    bindLatestUpdatesTabs();
    localizeLuTabLabels();
    mountHomeFeed(false);
    hydrateHomepageConfig();
    bindLiveEvents();
  }

  window.CSOHomeHydration = {
    refresh: function () { mountHomeFeed(true); },
    renderFeed: renderAllFromFeed
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  setInterval(function () { if (!document.hidden) mountHomeFeed(false); }, 90000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) mountHomeFeed(false); });
})();
