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
    exam_updates: 'cso-home-exams-section',
    results: 'cso-home-results-section',
    current_affairs: 'cso-home-ca-section',
    mock_tests: 'cso-home-mocks-section',
    syllabus_pyq: 'cso-home-syllabus-section',
    schemes: 'cso-home-schemes-section'
  };

  var FEED_HEADER_COPY = {
    jobs: { icon: '\uD83D\uDCBC', en: 'Job Alerts', or: 'ଚାକିରି ବିଜ୍ଞପ୍ତି', allEn: 'All Jobs \u2192', allOr: 'ସବୁ ଚାକିରି \u2192' },
    exam_updates: { icon: '\uD83E\uDEAA', en: 'Exam Updates & Admit Cards', or: 'ପରୀକ୍ଷା ସୂଚନା ଓ ଆଡମିଟ୍ କାର୍ଡ', allEn: 'All Exams \u2192', allOr: 'ସବୁ ପରୀକ୍ଷା \u2192' },
    results: { icon: '\uD83C\uDFC6', en: 'Results', or: 'ପରୀକ୍ଷା ଫଳାଫଳ', allEn: 'All Results \u2192', allOr: 'ସବୁ ଫଳାଫଳ \u2192' },
    current_affairs: { icon: '\uD83D\uDCF0', en: 'Daily Current Affairs', or: 'ଦୈନିକ ସାମ୍ପ୍ରତିକ ଘଟଣାବଳୀ', allEn: 'All Briefs \u2192', allOr: 'ସବୁ ସମ୍ବାଦ \u2192' },
    mock_tests: { icon: '\u23F1\uFE0F', en: 'Live CBT Mock Tests', or: 'ଲାଇଭ୍ CBT ମକ୍ ଟେଷ୍ଟ', allEn: 'All Tests \u2192', allOr: 'ସବୁ ପରୀକ୍ଷା \u2192' },
    syllabus_pyq: { icon: '\uD83D\uDCD1', en: 'Syllabus & PYQ Papers', or: 'ସିଲାବସ୍ ଏବଂ PYQ ପେପର୍', allEn: 'Study Library \u2192', allOr: 'ଅଧ୍ୟୟନ ଲାଇବ୍ରେରୀ \u2192' },
    schemes: { icon: '\uD83C\uDFDB\uFE0F', en: 'Government Schemes', or: 'ସରକାରୀ ଯୋଜନା', allEn: 'All Schemes \u2192', allOr: 'ସବୁ ଯୋଜନା \u2192' }
  };

  var ODIA_DIGITS = ['୦', '୧', '୨', '୩', '୪', '୫', '୬', '୭', '୮', '୯'];

  function toOdiaDigits(val) {
    return String(val).replace(/[0-9]/g, function (d) { return ODIA_DIGITS[Number(d)] || d; });
  }

  function formatTopicCount(count, isOr) {
    var n = Number(count) || 0;
    if (n <= 0) return isOr ? 'ଦେଖନ୍ତୁ' : 'Explore';
    return isOr ? (toOdiaDigits(n) + ' ଲାଇଭ୍') : (String(n) + ' Live');
  }

  function buildTopicIconSvg(iconKey) {
    var NS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('width', '22');
    svg.setAttribute('height', '22');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('aria-hidden', 'true');
    function add(tag, attrs) {
      var node = document.createElementNS(NS, tag);
      Object.keys(attrs).forEach(function (k) { node.setAttribute(k, attrs[k]); });
      svg.appendChild(node);
    }
    if (iconKey === 'exams') {
      add('path', { d: 'M22 10v6M2 10l10-5 10 5-10 5z' });
      add('path', { d: 'M6 12v5c3 3 9 3 12 0v-5' });
    } else if (iconKey === 'schemes') {
      add('circle', { cx: '12', cy: '8', r: '7' });
      add('polyline', { points: '8.21 13.89 7 23 12 20 17 23 15.79 13.88' });
    } else if (iconKey === 'study') {
      add('path', { d: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20' });
      add('path', { d: 'M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z' });
    } else if (iconKey === 'career') {
      add('circle', { cx: '12', cy: '12', r: '10' });
      add('polygon', { points: '16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76' });
    } else if (iconKey === 'odisha') {
      add('polygon', { points: '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2' });
    } else {
      add('rect', { x: '2', y: '7', width: '20', height: '14', rx: '2', ry: '2' });
      add('path', { d: 'M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16' });
    }
    return svg;
  }

  function topicPillModifier(badgeText) {
    var b = String(badgeText || '').trim().toUpperCase();
    if (b === 'HOT') return ' cso-topic-pill--hot';
    if (b === 'NEW') return ' cso-topic-pill--new';
    return ' cso-topic-pill--year';
  }

  function renderTrendingTopicsSection(topics) {
    var sec = document.getElementById('cso-trending-topics');
    if (!sec) return;
    var grid = sec.querySelector('#cso-trending-grid') || sec.querySelector('.trending-grid');
    if (!grid) return;
    if (!Array.isArray(topics) || !topics.length) return;

    var enabled = topics.filter(function (t) { return t && t.enabled !== false; });
    if (!enabled.length) return;

    var isOr = isOdiaActive();
    var frag = document.createDocumentFragment();
    enabled.forEach(function (t) {
      var iconKey = String(t.icon || t.id || 'jobs').toLowerCase();
      if (['jobs', 'exams', 'schemes', 'study', 'career', 'odisha'].indexOf(iconKey) === -1) iconKey = 'jobs';

      var card = makeLink('cso-topic-card cso-topic-card--' + iconKey, '', t.href || '/guides/', true);
      card.setAttribute('data-topic-id', String(t.id || iconKey));

      var top = make('div', 'cso-topic-card__top');
      var badge = make('div', 'cso-topic-card__badge');
      badge.setAttribute('aria-hidden', 'true');
      badge.appendChild(buildTopicIconSvg(iconKey));
      top.appendChild(badge);

      var meta = make('div', 'cso-topic-card__meta');
      var pillTxt = String(t.badge_text || '').trim();
      if (pillTxt) {
        meta.appendChild(make('span', 'cso-topic-pill' + topicPillModifier(pillTxt), pillTxt));
      }
      var cnt = Number(t.item_count || 0) || 0;
      var cntEl = make('span', 'cso-topic-count', formatTopicCount(cnt, isOr));
      cntEl.setAttribute('data-en', formatTopicCount(cnt, false));
      cntEl.setAttribute('data-or', formatTopicCount(cnt, true));
      if (cnt > 0) {
        cntEl.setAttribute('aria-label', isOr ? (toOdiaDigits(cnt) + 'ଟି ପ୍ରକାଶିତ ବିଷୟ') : (cnt + ' live items'));
      }
      meta.appendChild(cntEl);
      top.appendChild(meta);
      card.appendChild(top);

      var textBox = make('div', 'cso-topic-card__text');
      var h3 = make('h3', 'cso-topic-card__title');
      var titleEn = String(t.title_en || '');
      var titleOr = String(t.title_or || titleEn);
      var lbl = make('span', 'cso-topic-card__label', pickBi(titleEn, titleOr));
      lbl.setAttribute('data-en', titleEn);
      lbl.setAttribute('data-or', titleOr);
      h3.appendChild(lbl);
      h3.appendChild(document.createTextNode(' '));
      var arrow = make('span', 'arrow', '\u2192');
      arrow.setAttribute('aria-hidden', 'true');
      h3.appendChild(arrow);
      textBox.appendChild(h3);

      var subEn = String(t.subtitle_en || '');
      var subOr = String(t.subtitle_or || subEn);
      if (subEn || subOr) {
        var desc = make('p', 'cso-topic-card__desc', pickBi(subEn, subOr));
        desc.setAttribute('data-en', subEn);
        desc.setAttribute('data-or', subOr);
        textBox.appendChild(desc);
      }

      card.appendChild(textBox);
      frag.appendChild(card);
    });

    grid.replaceChildren(frag);
  }

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
    primary.querySelectorAll('[data-en][data-or]').forEach(function (node) {
      var val = isOr ? node.getAttribute('data-or') : node.getAttribute('data-en');
      if (val) node.textContent = val;
    });
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

    // v352: Localize Important Tools header & compact tool cards (EN / ଓଡ଼ିଆ)
    var toolsSec = document.getElementById('cso-tools');
    if (toolsSec) {
      toolsSec.querySelectorAll('[data-en][data-or]').forEach(function (node) {
        node.textContent = isOr ? node.getAttribute('data-or') : node.getAttribute('data-en');
      });
      toolsSec.querySelectorAll('.tool-card').forEach(function (card) {
        var b = card.querySelector('b');
        var sm = card.querySelector('small');
        var tEn = card.getAttribute('data-title-en');
        var tOr = card.getAttribute('data-title-or');
        var sEn = card.getAttribute('data-sub-en');
        var sOr = card.getAttribute('data-sub-or');
        if (b && (tEn || tOr)) b.textContent = (isOr && tOr) ? tOr : (tEn || b.textContent);
        if (sm && (sEn || sOr)) sm.textContent = (isOr && sOr) ? sOr : (sEn || sm.textContent);
      });
    }
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
    var toolsSec = document.getElementById('cso-tools');
    if (toolsSec && Object.prototype.hasOwnProperty.call(map, 'important_tools')) {
      toolsSec.hidden = map.important_tools === false;
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
      (String(opts.actionLabel || '').trim()) || 'Open \u2192',
      actHref,
      Boolean(opts.actionExternal)
    );
    actLink.setAttribute('aria-label', opts.actionAria || titleText);
    if (opts.actionExternal) {
      actLink.setAttribute('target', '_blank');
      actLink.setAttribute('rel', 'noopener noreferrer');
    }
    if (opts.saveItem && window.CSOSavedAlerts && typeof window.CSOSavedAlerts.createBookmarkButton === 'function') {
      var actWrap = make('div', 'cso-hf-row__actions');
      var bmBtn = window.CSOSavedAlerts.createBookmarkButton(opts.saveItem, { compact: true, isOr: isOdiaActive() });
      if (bmBtn) actWrap.appendChild(bmBtn);
      actWrap.appendChild(actLink);
      row.appendChild(actWrap);
    } else {
      row.appendChild(actLink);
    }
    return row;
  }

  function mapBadgeTone(tone, fallback) {
    if (tone === 'brand' || tone === 'accent') return 'accent';
    if (tone === 'warning' || tone === 'warn') return 'warn';
    if (tone === 'info') return 'info';
    if (tone === 'ok' || tone === 'success') return 'ok';
    return fallback || 'accent';
  }

  /* 2. Latest Job Alerts & Admit Cards (up to 4 compact rows) */
  function renderJobsSection(jobs) {
    var grid = document.getElementById('cso-home-jobs-grid');
    if (!grid || !Array.isArray(jobs) || !jobs.length) return;
    var isOr = isOdiaActive();
    var frag = document.createDocumentFragment();
    jobs.slice(0, 4).forEach(function (job) {
      var href = safeHref(job.url || job.href) || ('/jobs/?slug=' + encodeURIComponent(job.slug || job.id || ''));
      var title = pickBi(job.title_en, job.title_or, 'Job Notification');
      var metaText = isOr ? (job.meta_or || '') : (job.meta_en || '');
      if (!metaText) {
        var metaParts = [];
        if (job.last_date) metaParts.push((isOr ? 'ଶେଷ: ' : 'Last Date: ') + formatCompactDate(job.last_date));
        if (Number(job.vacancies || 0) > 0) metaParts.push(Number(job.vacancies).toLocaleString('en-IN') + (isOr ? ' ପଦବୀ' : ' Posts'));
        else if (job.district) metaParts.push(job.district);
        metaText = metaParts.join(' \u2022 ');
      }
      var actLabel = isOr
        ? (job.action_label_or || 'ବିଜ୍ଞପ୍ତି \u2192')
        : (job.action_label_en || 'Notice \u2192');
      frag.appendChild(buildCompactFeedRow({
        title: title,
        href: href,
        pill: job.org_badge || job.category || job.organisation_en || 'Odisha Govt',
        pillTone: mapBadgeTone(job.badge_tone, 'accent'),
        meta: metaText,
        actionLabel: actLabel,
        actionAria: (isOr ? 'ଦେଖନ୍ତୁ: ' : 'View job: ') + title,
        saveItem: {
          id: 'job:' + (job.slug || job.id || title),
          slug: job.slug || job.id || '',
          url: href,
          title_en: job.title_en || title,
          title_or: job.title_or || '',
          org: job.organisation_en || job.org_badge || 'Odisha Govt',
          category: 'job_alert',
          deadline_iso: job.last_date || job.exam_date || '',
          deadline_label: /walk-?in/i.test(job.title_en || '') ? 'Walk-in Interview' : 'Last Date',
          venue_or_mode: job.district || 'Odisha / Official Portal',
          official_url: job.official_apply_url || ''
        }
      }));
    });
    grid.replaceChildren(frag);
  }

  /* 2b. Exam Updates & Admit Cards (up to 4 compact rows) */
  function renderExamUpdatesSection(items) {
    var grid = document.getElementById('cso-home-exams-grid');
    if (!grid || !Array.isArray(items) || !items.length) return;
    var isOr = isOdiaActive();
    var frag = document.createDocumentFragment();
    items.slice(0, 4).forEach(function (ex) {
      var href = safeHref(ex.url || ex.href) || '/exams/';
      var title = pickBi(ex.title_en, ex.title_or, 'Exam Update');
      var metaText = isOr ? (ex.meta_or || ex.meta_en || '') : (ex.meta_en || '');
      var actLabel = isOr
        ? (ex.action_label_or || 'ସୂଚୀ \u2192')
        : (ex.action_label_en || 'Schedule \u2192');
      frag.appendChild(buildCompactFeedRow({
        title: title,
        href: href,
        pill: ex.org_badge || 'Exam',
        pillTone: mapBadgeTone(ex.badge_tone, 'info'),
        meta: metaText,
        actionLabel: actLabel,
        actionAria: (isOr ? 'ଦେଖନ୍ତୁ: ' : 'View exam update: ') + title,
        saveItem: {
          id: 'exam:' + (ex.slug || ex.id || title),
          slug: ex.slug || ex.id || '',
          url: href,
          title_en: ex.title_en || title,
          title_or: ex.title_or || '',
          org: ex.org_badge || 'Exam Board',
          category: 'exam_update',
          deadline_iso: ex.exam_date || ex.last_date || ex.meta_en || '',
          deadline_label: 'Exam / Admit Card'
        }
      }));
    });
    grid.replaceChildren(frag);
  }

  /* 2c. Results (up to 4 compact rows) */
  function renderResultsSection(items) {
    var grid = document.getElementById('cso-home-results-grid');
    if (!grid || !Array.isArray(items) || !items.length) return;
    var isOr = isOdiaActive();
    var frag = document.createDocumentFragment();
    items.slice(0, 4).forEach(function (res) {
      var href = safeHref(res.url || res.href) || '/exams/#results';
      var title = pickBi(res.title_en, res.title_or, 'Exam Result');
      var metaText = isOr ? (res.meta_or || res.meta_en || '') : (res.meta_en || '');
      var actLabel = isOr
        ? (res.action_label_or || 'ଫଳାଫଳ \u2192')
        : (res.action_label_en || 'Result \u2192');
      frag.appendChild(buildCompactFeedRow({
        title: title,
        href: href,
        pill: res.org_badge || 'Result',
        pillTone: mapBadgeTone(res.badge_tone, 'ok'),
        meta: metaText,
        actionLabel: actLabel,
        actionAria: (isOr ? 'ଫଳାଫଳ ଦେଖନ୍ତୁ: ' : 'View result: ') + title,
        saveItem: {
          id: 'result:' + (res.slug || res.id || title),
          slug: res.slug || res.id || '',
          url: href,
          title_en: res.title_en || title,
          title_or: res.title_or || '',
          org: res.org_badge || 'Board Result',
          category: 'result',
          deadline_iso: res.last_date || res.meta_en || '',
          deadline_label: 'Result / OMR Window'
        }
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
        actionLabel: isOr ? 'ବ୍ରିଫ୍ \u2192' : 'Brief \u2192',
        actionAria: (isOr ? 'ପଢ଼ନ୍ତୁ: ' : 'Read brief: ') + title,
        saveItem: {
          id: 'ca:' + (ca.slug || ca.id || ca.date || title),
          slug: ca.slug || ca.id || '',
          url: href,
          title_en: ca.title_en || title,
          title_or: ca.title_or || '',
          org: ca.category || 'Current Affairs',
          category: 'guide',
          deadline_iso: ''
        }
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
        actionLabel: pdfHref ? 'PDF' : (isOr ? 'ଖୋଲନ୍ତୁ \u2192' : 'Open \u2192'),
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
        actionLabel: isOr ? 'ରୋଡମ୍ୟାପ୍ \u2192' : 'Roadmap \u2192',
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
        actionLabel: isOr ? 'ଯୋଜନା \u2192' : 'Scheme \u2192',
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
    GUIDE: 'cso-lu-badge cso-lu-badge--guide',
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

    // Ensure clean list container (remove any legacy ticker windows or empty paragraphs)
    panel.classList.remove('cso-ticker-active');
    panel.querySelectorAll('.cso-ticker-window, .em, :scope > .it').forEach(function (x) { x.remove(); });
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
        var visibleFallbacks = listHost.querySelectorAll('.cso-lu-fallback:not([hidden])');
        if (visibleFallbacks.length) return;
      }
      var emptyMsg = isOr
        ? 'ଏହି ବର୍ଗରେ ଏବେ କୌଣସି ଅପଡେଟ୍ ନାହିଁ। ସବୁ ଅପଡେଟ୍ ଦେଖିବାକୁ "ସମସ୍ତ" କ୍ଲିକ୍ କରନ୍ତୁ।'
        : 'No updates in this category yet. Click All to view recent updates.';
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

  function renderHomeFeedSections(feed) {
    if (!feed) return;
    renderJobsSection(feed.jobs);
    renderExamUpdatesSection(feed.exam_updates);
    renderResultsSection(feed.results);
    renderCurrentAffairsSection(feed.current_affairs);
    renderMockTestsSection(feed.mocks || feed.mock_tests);
    renderSyllabusSection(feed.study || feed.syllabus_pyq);
    renderSchemesSection(feed.schemes);
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
    if (Array.isArray(feed.trending_topics) && feed.trending_topics.length) {
      renderTrendingTopicsSection(feed.trending_topics);
    }
    localizeFeedHeaders();
    renderLatestUpdatesPanel(feed);
    renderHomeFeedSections(feed);
    renderHeroKpis(feed.portal_stats);
  }

  /* v369: live portal snapshot strip (zero CLS: tiles pre-rendered in index.html) */
  function renderHeroKpis(stats) {
    var strip = document.getElementById('cso-hero-kpis');
    if (!strip || !stats) return;
    ['districts', 'guides', 'mocks'].forEach(function (k) {
      var n = strip.querySelector('[data-kpi="' + k + '"]');
      var v = Number(stats[k]);
      if (n && isFinite(v) && v >= 0) n.textContent = v.toLocaleString('en-IN');
    });
  }

  /* v369: 30-district quick filter (CSP-safe, addEventListener only) */
  function applyDistrict(d) {
    var bar = document.getElementById('cso-dist-bar');
    if (!bar) return;
    bar.querySelectorAll('.cso-dist-chip').forEach(function (b) {
      var on = (b.getAttribute('data-district') || '') === d;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    var sel = document.getElementById('cso-dist-select');
    if (sel && sel.value !== d) sel.value = d;
    var items = document.querySelectorAll('#cso-lu-list .cso-lu-item');
    var needle = d.toLowerCase();
    var hits = 0;
    items.forEach(function (it) {
      var match = !needle || (it.textContent || '').toLowerCase().indexOf(needle) !== -1;
      it.hidden = !match;
      if (match) hits += 1;
    });
    if (needle && !hits) {
      items.forEach(function (it) { it.hidden = false; });
      window.location.assign('/guides/?district=' + encodeURIComponent(d));
    }
  }

  function bindDistrictFilter() {
    var bar = document.getElementById('cso-dist-bar');
    if (!bar || bar.getAttribute('data-bound') === '1') return;
    bar.setAttribute('data-bound', '1');
    bar.addEventListener('click', function (ev) {
      var b = ev.target && ev.target.closest ? ev.target.closest('.cso-dist-chip') : null;
      if (b) applyDistrict(b.getAttribute('data-district') || '');
    });
    var sel = document.getElementById('cso-dist-select');
    if (sel) sel.addEventListener('change', function () { applyDistrict(sel.value || ''); });
  }

  function localizeHeroBilingual() {
    var isOr = isOdiaActive();
    document.querySelectorAll('#cso-hero-kpis [data-en], #cso-dist-bar [data-en]').forEach(function (n) {
      var t = isOr ? n.getAttribute('data-or') : n.getAttribute('data-en');
      if (t) n.textContent = t;
    });
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
    var fetchOpts = {
      credentials: 'same-origin',
      cache: url.indexOf('_cb=') !== -1 ? 'no-store' : 'no-cache'
    };

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
    var isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    var inp = document.getElementById('cso-ask-input');
    if (inp) {
      if (isMobile) {
        inp.placeholder = isOr
          ? 'ଚାକିରି, ଯୋଜନା, ପରୀକ୍ଷା, ସିଲାବସ୍ ଖୋଜନ୍ତୁ...'
          : 'Ask jobs, schemes, exams, syllabus...';
      } else {
        inp.placeholder = isOr
          ? 'ଓଡ଼ିଆ କିମ୍ବା ଇଂରାଜୀରେ ପଚାରନ୍ତୁ — ଚାକିରି, ଯୋଜନା, ସିଲାବସ୍, OPSC, ବୃତ୍ତି...'
          : 'Ask CSOdisha in EN or ଓଡ଼ିଆ — jobs, schemes, syllabus, OPSC, scholarships...';
      }
    }
    var askLbl = document.querySelector('#cso-hero-ask-btn .cso-hero-ask-label');
    if (askLbl && !(document.getElementById('cso-hero-ask-btn') && document.getElementById('cso-hero-ask-btn').disabled)) {
      askLbl.textContent = isOr ? '✨ ପଚାରନ୍ତୁ' : '✨ Ask';
    }
    var clr = document.getElementById('cso-hero-clear');
    if (clr) clr.textContent = isOr ? '✕ ସଫା କରନ୍ତୁ' : '✕ Clear';
    var chipsLbl = document.getElementById('chips-label');
    if (chipsLbl) chipsLbl.textContent = isOr ? 'ଲୋକପ୍ରିୟ ସନ୍ଧାନ:' : 'Popular Searches:';

    localizeHeroBilingual();
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
    document.querySelectorAll('.lu > .em').forEach(function (x) { x.remove(); });
    localizeHeroCopy();
    bindDistrictFilter();
    localizeFeedHeaders();
    bindLatestUpdatesTabs();
    localizeLuTabLabels();
    mountHomeFeed(false);
    hydrateHomepageConfig();
    bindLiveEvents();
    window.addEventListener('resize', localizeHeroCopy);
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
