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

  /* 1. Top Homepage Broadcast Ticker (v341: per-broadcast ID dismissal + EN/OR live sync) */
  function getBroadcastDismissId(data) {
    if (!data) return '';
    return String(data.id || data.updatedAt || data.headline || '').trim();
  }

  function isBroadcastDismissed(bId) {
    if (!bId) return false;
    try {
      if (localStorage.getItem('cso_dismissed_broadcast_id') === bId) return true;
    } catch (_) {}
    try {
      if (sessionStorage.getItem('cso_dismissed_announcement_' + bId)) return true;
    } catch (_) {}
    return false;
  }

  function markBroadcastDismissed(bId) {
    if (!bId) return;
    try { localStorage.setItem('cso_dismissed_broadcast_id', bId); } catch (_) {}
    try { sessionStorage.setItem('cso_dismissed_announcement_' + bId, 'true'); } catch (_) {}
  }

  function renderLiveBanner(data) {
    var mount = document.getElementById('csoPublicAnnouncementMount');
    if (!mount) return;
    mount.textContent = '';
    if (!data || !data.active || !data.headline) return;
    var bId = getBroadcastDismissId(data);
    if (isBroadcastDismissed(bId)) return;

    var sev = SEV_CLASS[data.severity] ? data.severity : 'info';
    var bar = make('div', SEV_CLASS[sev]);
    bar.id = 'csoLiveBanner';
    bar.setAttribute('role', 'status');
    bar.setAttribute('aria-live', 'polite');
    bar.setAttribute('data-broadcast-id', bId);

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

    var close = make('button', 'cso-live-banner__close', '\u2715');
    close.type = 'button';
    close.setAttribute('title', isOdiaActive() ? 'ବନ୍ଦ କରନ୍ତୁ' : 'Dismiss broadcast');
    close.setAttribute('aria-label', isOdiaActive() ? 'ବ୍ରଡକାଷ୍ଟ ବନ୍ଦ କରନ୍ତୁ' : 'Dismiss broadcast');
    close.addEventListener('click', function () {
      bar.remove();
      markBroadcastDismissed(bId);
    });

    bar.appendChild(left);
    bar.appendChild(close);
    mount.appendChild(bar);
  }

  function formatCompactDate(raw) {
    var s = String(raw || '').trim();
    if (!s) return '';
    var m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return s.slice(0, 12);
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var mo = months[Number(m[2]) - 1] || m[2];
    return String(Number(m[3])) + ' ' + mo;
  }

  var FEED_SECTION_MAP = {
    jobs: 'cso-home-jobs-section',
    current_affairs: 'cso-home-ca-section',
    mock_tests: 'cso-home-mocks-section',
    syllabus_pyq: 'cso-home-syllabus-section',
    careers: 'cso-home-careers-section',
    schemes: 'cso-home-schemes-section'
  };

  var FEED_HEADER_COPY = {
    jobs: { icon: '\uD83D\uDCBC', en: 'Job Alerts & Admit Cards', or: 'ଚାକିରି ଏବଂ ଆଡମିଟ୍ କାର୍ଡ', allEn: 'All Jobs \u2192', allOr: 'ସବୁ ଚାକିରି \u2192' },
    current_affairs: { icon: '\uD83D\uDCF0', en: 'Daily Current Affairs', or: 'ଦୈନିକ ସାମ୍ପ୍ରତିକ ଘଟଣାବଳୀ', allEn: 'All Briefs \u2192', allOr: 'ସବୁ ସମ୍ବାଦ \u2192' },
    mock_tests: { icon: '\u23F1\uFE0F', en: 'Live CBT Mock Tests', or: 'ଲାଇଭ୍ CBT ମକ୍ ଟେଷ୍ଟ', allEn: 'All Tests \u2192', allOr: 'ସବୁ ପରୀକ୍ଷା \u2192' },
    syllabus_pyq: { icon: '\uD83D\uDCD1', en: 'Syllabus & PYQ Papers', or: 'ସିଲାବସ୍ ଏବଂ PYQ ପେପର୍', allEn: 'Study Library \u2192', allOr: 'ଅଧ୍ୟୟନ ଲାଇବ୍ରେରୀ \u2192' },
    careers: { icon: '\uD83E\uDDED', en: 'Career Roadmaps', or: 'କ୍ୟାରିୟର ରୋଡମ୍ୟାପ୍', allEn: 'All Roadmaps \u2192', allOr: 'ସବୁ ରୋଡମ୍ୟାପ୍ \u2192' },
    schemes: { icon: '\uD83C\uDFDB\uFE0F', en: 'Government Schemes', or: 'ସରକାରୀ ଯୋଜନା', allEn: 'All Schemes \u2192', allOr: 'ସବୁ ଯୋଜନା \u2192' }
  };

  function ensureTrendingTopicsOrder() {
    var allTrending = document.querySelectorAll('#cso-trending-topics, .cso-trending-topics-sec');
    if (!allTrending.length) return;
    var primary = allTrending[0];
    for (var i = 1; i < allTrending.length; i += 1) {
      allTrending[i].remove();
    }
    var feeds = document.getElementById('cso-home-feeds');
    if (feeds && primary.parentNode && feeds.parentNode === primary.parentNode) {
      if (primary.compareDocumentPosition(feeds) & Node.DOCUMENT_POSITION_PRECEDING) {
        feeds.parentNode.insertBefore(primary, feeds);
      }
    }
    var isOr = isOdiaActive();
    var titleEl = primary.querySelector('h2 .cso-h2-bl');
    if (titleEl) titleEl.textContent = isOr ? 'ଟ୍ରେଣ୍ଡିଂ ଏବଂ ଲୋକପ୍ରିୟ ବିଷୟ' : 'Trending & Popular Topics';
    var subEl = primary.querySelector('h2 small');
    if (subEl) subEl.textContent = isOr ? 'ଶିକ୍ଷା, କ୍ୟାରିୟର, ଯୋଜନା ଏବଂ ସରକାରୀ ସେବା ଖୋଜନ୍ତୁ' : 'Explore education, careers, schemes and public services';
    var linkEl = primary.querySelector('h2 .cso-h2-link');
    if (linkEl) linkEl.textContent = isOr ? 'ସବୁ ବିଷୟ ଦେଖନ୍ତୁ \u2192' : 'View All Topics \u2192';
  }

  function localizeFeedHeaders() {
    ensureTrendingTopicsOrder();
    var isOr = isOdiaActive();
    Object.keys(FEED_HEADER_COPY).forEach(function (key) {
      var cfg = FEED_HEADER_COPY[key];
      var sec = document.getElementById(FEED_SECTION_MAP[key]);
      if (!sec) return;
      var h2 = sec.querySelector('.cso-hf-title');
      if (h2) {
        h2.replaceChildren();
        var ico = make('span', '', cfg.icon);
        ico.setAttribute('aria-hidden', 'true');
        h2.appendChild(ico);
        h2.appendChild(document.createTextNode(' ' + (isOr ? cfg.or : cfg.en)));
      }
      var va = sec.querySelector('.cso-hf-viewall');
      if (va) va.textContent = isOr ? cfg.allOr : cfg.allEn;
    });
  }

  function applySectionVisibility(vis) {
    var map = (vis && typeof vis === 'object') ? vis : {};
    var visibleCount = 0;
    Object.keys(FEED_SECTION_MAP).forEach(function (key) {
      var sec = document.getElementById(FEED_SECTION_MAP[key]);
      if (!sec) return;
      var show = map[key] !== false;
      sec.hidden = !show;
      if (show) visibleCount += 1;
    });
    var wrap = document.getElementById('cso-home-feeds');
    if (wrap) {
      wrap.hidden = visibleCount === 0;
      wrap.classList.toggle('cso-hf-split-grid--single', visibleCount === 1);
    }
  }

  function buildCompactFeedRow(opts) {
    var row = make('article', 'cso-hf-row');
    var main = make('div', 'cso-hf-row__main');
    var titleText = opts.title || 'Update';
    var titleLink = makeLink('cso-hf-row__title', titleText, opts.href, Boolean(opts.external));
    main.appendChild(titleLink);

    var sub = make('div', 'cso-hf-row__sub');
    if (opts.pill) {
      sub.appendChild(make('span', 'cso-hf-pill' + (opts.pillTone ? (' cso-hf-pill--' + opts.pillTone) : ''), truncate(opts.pill, 26)));
    }
    if (opts.meta) {
      sub.appendChild(make('span', 'cso-hf-row__meta', truncate(opts.meta, 48)));
    }
    if (sub.childNodes.length) main.appendChild(sub);
    row.appendChild(main);

    var actHref = opts.actionHref || opts.href;
    var actLink = makeLink(
      'cso-hf-row__act' + (opts.primaryAction ? ' cso-hf-row__act--primary' : ''),
      opts.actionLabel || '\u2192',
      actHref,
      Boolean(opts.actionExternal)
    );
    actLink.setAttribute('aria-label', opts.actionAria || titleText);
    if (opts.actionExternal) {
      actLink.setAttribute('target', '_blank');
      actLink.setAttribute('rel', 'noopener noreferrer');
    }
    row.appendChild(actLink);
    return row;
  }

  /* 2. Latest Job Alerts & Admit Cards (up to 4 compact rows) */
  function renderJobsSection(jobs) {
    var grid = document.getElementById('cso-home-jobs-grid');
    if (!grid || !Array.isArray(jobs) || !jobs.length) return;
    var isOr = isOdiaActive();
    var frag = document.createDocumentFragment();
    jobs.slice(0, 4).forEach(function (job) {
      var href = safeHref(job.href) || ('/jobs/' + encodeURIComponent(job.slug || job.id || ''));
      var title = pickBi(job.title_en, job.title_or, 'Job Notification');
      var metaParts = [];
      if (job.last_date) metaParts.push((isOr ? 'ଶେଷ: ' : 'Last Date: ') + formatCompactDate(job.last_date));
      if (Number(job.vacancies || 0) > 0) metaParts.push(Number(job.vacancies).toLocaleString('en-IN') + (isOr ? ' ପଦବୀ' : ' Posts'));
      else if (job.district) metaParts.push(job.district);
      frag.appendChild(buildCompactFeedRow({
        title: title,
        href: href,
        pill: job.category || job.organisation_en || 'Odisha Govt',
        pillTone: 'accent',
        meta: metaParts.join(' \u2022 '),
        actionLabel: '\u2192',
        actionAria: (isOr ? 'ଦେଖନ୍ତୁ: ' : 'View job: ') + title
      }));
    });
    grid.replaceChildren(frag);
  }

  /* 3. Daily Current Affairs (up to 4 compact rows) */
  function renderCurrentAffairsSection(items) {
    var grid = document.getElementById('cso-home-ca-grid');
    if (!grid || !Array.isArray(items) || !items.length) return;
    var isOr = isOdiaActive();
    var frag = document.createDocumentFragment();
    items.slice(0, 4).forEach(function (ca) {
      var href = safeHref(ca.href) || ('/current-affairs/' + encodeURIComponent(ca.slug || ca.id || ''));
      var title = pickBi(ca.title_en, ca.title_or, 'Current Affairs Update');
      var metaParts = [];
      if (ca.category) metaParts.push(ca.category);
      if (Number(ca.quiz_count || 0) > 0) metaParts.push(String(ca.quiz_count) + ' MCQs');
      else if (Number(ca.highlights_count || 0) > 0) metaParts.push(String(ca.highlights_count) + (isOr ? ' ପଏଣ୍ଟ' : ' Pts'));
      frag.appendChild(buildCompactFeedRow({
        title: title,
        href: href,
        pill: formatCompactDate(ca.date) || ca.category || 'Daily',
        pillTone: 'info',
        meta: metaParts.join(' \u2022 '),
        actionLabel: '\u2192',
        actionAria: (isOr ? 'ପଢ଼ନ୍ତୁ: ' : 'Read brief: ') + title
      }));
    });
    grid.replaceChildren(frag);
  }

  /* 4. Live CBT Mock Tests (up to 4 compact rows) */
  function renderMockTestsSection(tests) {
    var grid = document.getElementById('cso-home-mocks-grid');
    if (!grid || !Array.isArray(tests) || !tests.length) return;
    var isOr = isOdiaActive();
    var frag = document.createDocumentFragment();
    tests.slice(0, 4).forEach(function (t) {
      var href = safeHref(t.href) || ('/mock-tests/?test=' + encodeURIComponent(t.slug || t.id || ''));
      var title = pickBi(t.title_en, t.title_or, 'CBT Mock Test');
      var metaParts = [];
      if (Number(t.question_count || 0) > 0) metaParts.push(String(t.question_count) + ' Qs');
      if (Number(t.duration_minutes || 0) > 0) metaParts.push(String(t.duration_minutes) + 'm');
      if (Number(t.negative_marking || 0) > 0) metaParts.push('-' + String(t.negative_marking));
      frag.appendChild(buildCompactFeedRow({
        title: title,
        href: href,
        pill: t.exam_category || 'CBT',
        pillTone: 'accent',
        meta: metaParts.join(' \u2022 ') || (isOr ? 'ଅନଲାଇନ୍ CBT' : 'Timed CBT'),
        actionLabel: isOr ? 'ଆରମ୍ଭ' : 'Start',
        primaryAction: true,
        actionAria: (isOr ? 'ପରୀକ୍ଷା ଆରମ୍ଭ କରନ୍ତୁ: ' : 'Start mock test: ') + title
      }));
    });
    grid.replaceChildren(frag);
  }

  /* 5. Syllabus & PYQ Papers (up to 4 compact rows) */
  function renderSyllabusSection(items) {
    var grid = document.getElementById('cso-home-syllabus-grid');
    if (!grid || !Array.isArray(items) || !items.length) return;
    var isOr = isOdiaActive();
    var frag = document.createDocumentFragment();
    items.slice(0, 4).forEach(function (res) {
      var viewHref = safeHref(res.view_url) || '/study-library/';
      var pdfHref = safeHref(res.pdf_url);
      var title = pickBi(res.title_en, res.title_or, 'Syllabus / PYQ Resource');
      var metaParts = [];
      if (res.year) metaParts.push(String(res.year));
      if (res.resource_type) metaParts.push(res.resource_type);
      if (pdfHref) metaParts.push('PDF');
      frag.appendChild(buildCompactFeedRow({
        title: title,
        href: viewHref,
        pill: res.exam_tag || 'Study',
        pillTone: 'info',
        meta: metaParts.join(' \u2022 '),
        actionLabel: pdfHref ? 'PDF' : '\u2192',
        actionHref: pdfHref || viewHref,
        actionExternal: Boolean(pdfHref),
        primaryAction: Boolean(pdfHref),
        actionAria: (pdfHref ? (isOr ? 'PDF ଡାଉନଲୋଡ୍: ' : 'Download PDF: ') : (isOr ? 'ଦେଖନ୍ତୁ: ' : 'Open resource: ')) + title
      }));
    });
    grid.replaceChildren(frag);
  }

  /* 6. Career Roadmaps (up to 4 compact rows) */
  function renderCareersSection(items) {
    var grid = document.getElementById('cso-home-careers-grid');
    if (!grid || !Array.isArray(items) || !items.length) return;
    var isOr = isOdiaActive();
    var frag = document.createDocumentFragment();
    items.slice(0, 4).forEach(function (car) {
      var href = safeHref(car.href) || ('/careers/' + encodeURIComponent(car.slug || car.id || ''));
      var title = pickBi(car.title_en, car.title_or, 'Career Roadmap');
      var metaParts = [];
      if (car.pay_band) metaParts.push(car.pay_band);
      if (car.career_stage && car.career_stage !== car.eligibility) metaParts.push(car.career_stage);
      frag.appendChild(buildCompactFeedRow({
        title: title,
        href: href,
        pill: car.eligibility || car.career_stage || (isOr ? 'କ୍ୟାରିୟର' : 'Roadmap'),
        pillTone: 'ok',
        meta: metaParts.join(' \u2022 '),
        actionLabel: '\u2192',
        actionAria: (isOr ? 'ରୋଡମ୍ୟାପ୍ ଦେଖନ୍ତୁ: ' : 'Explore roadmap: ') + title
      }));
    });
    grid.replaceChildren(frag);
  }

  /* 7. Government Schemes (up to 4 compact rows) */
  function renderSchemesSection(items) {
    var grid = document.getElementById('cso-home-schemes-grid');
    if (!grid || !Array.isArray(items) || !items.length) return;
    var isOr = isOdiaActive();
    var frag = document.createDocumentFragment();
    items.slice(0, 4).forEach(function (sch) {
      var href = safeHref(sch.href) || ('/schemes/' + encodeURIComponent(sch.slug || sch.id || ''));
      var title = pickBi(sch.title_en, sch.title_or, 'Government Scheme');
      var metaParts = [];
      if (sch.is_ongoing) metaParts.push(isOr ? 'ଚାଲୁ ଅଛି' : 'Ongoing');
      else if (sch.last_date) metaParts.push((isOr ? 'ଶେଷ: ' : 'Last Date: ') + formatCompactDate(sch.last_date));
      if (sch.benefit_summary) metaParts.push(truncate(sch.benefit_summary, 32));
      frag.appendChild(buildCompactFeedRow({
        title: title,
        href: href,
        pill: sch.department || (isOr ? 'ଓଡ଼ିଶା ସରକାର' : 'Odisha'),
        pillTone: 'ok',
        meta: metaParts.join(' \u2022 '),
        actionLabel: '\u2192',
        actionAria: (isOr ? 'ଯୋଜନା ଦେଖନ୍ତୁ: ' : 'View scheme: ') + title
      }));
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
    renderLiveBanner(feed.broadcast || { active: false });
    if (Array.isArray(feed.nav_header) && feed.nav_header.length && window.CSOHeaderNav && typeof window.CSOHeaderNav.applyHeaderLinks === 'function') {
      window.CSOHeaderNav.applyHeaderLinks(feed.nav_header);
    }
    applySectionVisibility(feed.section_visibility || feed.homepage_sections);
    localizeFeedHeaders();
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
    var onLangRefresh = function () {
      localizeHeroCopy();
      localizeFeedHeaders();
      localizeLuTabLabels();
      if (lastFeed) renderAllFromFeed(lastFeed);
    };

    window.addEventListener('cso:langchange', onLangRefresh);

    // Re-render immediately when user switches language pills (English / ଓଡ଼ିଆ)
    document.addEventListener('click', function (ev) {
      var pill = ev.target && ev.target.closest ? ev.target.closest('[data-cso-lang], [data-lang]') : null;
      if (pill) setTimeout(onLangRefresh, 60);
    });

    // Cross-tab instant sync when Admin Studio publishes an item or updates nav/broadcast
    window.addEventListener('storage', function (e) {
      if (e.key === 'cso_homepage_config') hydrateHomepageConfig();
      if (e.key === 'cso_home_feed_bust' || e.key === 'cso_nav_cache_bust') mountHomeFeed(true);
      if (e.key === 'cso_lang_pref' || e.key === 'cso_lang') onLangRefresh();
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
    localizeFeedHeaders();
    bindLatestUpdatesTabs();
    localizeLuTabLabels();
    mountHomeFeed(false);
    hydrateHomepageConfig();
    bindLiveEvents();
  }

  window.CSOHomeHydration = {
    refresh: function () { mountHomeFeed(true); },
    renderFeed: renderAllFromFeed,
    applySectionVisibility: applySectionVisibility
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  setInterval(function () { if (!document.hidden) mountHomeFeed(false); }, 90000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) mountHomeFeed(false); });
})();
