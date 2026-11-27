/**
 * Common Sense Odisha — Public Jobs & Careers Portal, Editorial Hero,
 * 3-Layer Taxonomy Explorer & Visual Article Engine (v254)
 * Powers /jobs/ and /jobs-careers/ from live D1 endpoints:
 *   GET  /api/public/jobs/tree
 *   GET  /api/public/jobs
 *   GET  /api/public/jobs/article?slug=...&preview_token=...
 *   POST /api/public/jobs/telemetry
 * Strict CSP-compliant: DOM APIs only — zero unsafe HTML string sinks, inline styles, or inline handlers.
 */
(function (window, document) {
  'use strict';

  var MOUNT_ID = 'cso-jobs-portal-root';
  var STAGE_ORDER = [
    ['notification', '1. Notification'],
    ['exam_date', '2. Exam Date'],
    ['admit_card', '3. Admit Card'],
    ['answer_key', '4. Answer Key'],
    ['result', '5. Result']
  ];
  var STAGE_LABELS = {
    notification: 'Apply Online',
    exam_date: 'Exam Date',
    admit_card: 'Admit Card',
    answer_key: 'Answer Key',
    result: 'Result',
    closed: 'Closed'
  };
  var QUAL_PRESETS = ['10th', '+2', 'Graduate', 'B.Ed / Technical'];
  var STAGE_PRESETS = [
    ['notification', 'Apply Online'],
    ['closing-soon', 'Closing Soon'],
    ['admit_card', 'Admit Card'],
    ['answer_key', 'Answer Key'],
    ['result', 'Result']
  ];
  var REGION_PRESETS = [
    ['odisha', 'Odisha'],
    ['central', 'Central'],
    ['all-india', 'All Over India'],
    ['foreign', 'Foreign']
  ];
  var ODISHA_DISTRICTS = [
    'All Odisha', 'All India', 'Foreign / Overseas', 'Angul', 'Balangir', 'Balasore', 'Bargarh', 'Bhadrak', 'Boudh',
    'Cuttack', 'Deogarh', 'Dhenkanal', 'Gajapati', 'Ganjam', 'Jagatsinghpur',
    'Jajpur', 'Jharsuguda', 'Kalahandi', 'Kandhamal', 'Kendrapara', 'Kendujhar',
    'Khordha', 'Koraput', 'Malkangiri', 'Mayurbhanj', 'Nabarangpur', 'Nayagarh',
    'Nuapada', 'Puri', 'Rayagada', 'Sambalpur', 'Subarnapur', 'Sundargarh'
  ];

  var state = {
    lang: 'en',
    tree: [],
    nodes: [],
    allItems: [],
    items: [],
    facets: { districts: [], qualifications: [], stages: [] },
    filters: { l1: '', l2: '', l3: '', region: '', district: '', qualification: '', stage: '', search: '' },
    candidate: null,
    isAdmin: false,
    articlePayload: null,
    activePdfUrl: '',
    activePdfPage: 1
  };

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = String(text);
    return n;
  }

  function clear(node) {
    while (node && node.firstChild) node.removeChild(node.firstChild);
    return node;
  }

  function findNodeById(nodes, id) {
    if (!id || !Array.isArray(nodes)) return null;
    var target = String(id);
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i] && String(nodes[i].id) === target) return nodes[i];
    }
    return null;
  }

  function safeHref(raw) {
    var s = String(raw || '').trim();
    if (!s) return '';
    if (s.startsWith('/') && !s.startsWith('//')) return s;
    if (/^https?:\/\//i.test(s)) return s;
    return '';
  }

  function pick(obj, field) {
    if (!obj) return '';
    if (state.lang === 'or' && obj[field + '_or']) return String(obj[field + '_or']);
    return String(obj[field + '_en'] || '');
  }

  function num(v) {
    try { return Number(v || 0).toLocaleString('en-IN'); } catch (_) { return String(v || 0); }
  }

  function sendTelemetry(eventName, article) {
    if (!article || (!article.id && !article.slug)) return;
    try {
      fetch('/api/public/jobs/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        keepalive: true,
        body: JSON.stringify({ id: article.id, slug: article.slug, event: eventName })
      }).catch(function () {});
    } catch (_) {}
  }

  function getLangPref() {
    try { return localStorage.getItem('cso_lang_pref') === 'or' ? 'or' : 'en'; } catch (_) { return 'en'; }
  }

  function setLangPref(lang) {
    state.lang = lang === 'or' ? 'or' : 'en';
    try { localStorage.setItem('cso_lang_pref', state.lang); } catch (_) {}
  }

  function activatePortalShell() {
    document.body.classList.add('cso-portal-active', 'cso-portal-jobs-active');
    var subBar = document.getElementById('cso-subpage-topbar');
    if (subBar) subBar.hidden = true;
    ['jobs-categories-panel', 'jobs-filters-panel', 'jobs-items-grid', 'explorer', 'search-results', 'load-status'].forEach(function (id) {
      var n = document.getElementById(id);
      if (n) n.hidden = true;
    });
  }

  function buildEmptyBriefcaseSvg() {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 48 48');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('class', 'jp-empty-svg');
    var paths = [
      ['rect', { x: '6', y: '14', width: '36', height: '25', rx: '5', stroke: 'currentColor', 'stroke-width': '2.4' }],
      ['path', { d: 'M17 14V11a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v3', stroke: 'currentColor', 'stroke-width': '2.4', 'stroke-linecap': 'round' }],
      ['path', { d: 'M6 24h36', stroke: 'currentColor', 'stroke-width': '2.2', 'stroke-opacity': '0.55' }],
      ['circle', { cx: '24', cy: '24', r: '3', fill: 'currentColor' }]
    ];
    paths.forEach(function (spec) {
      var node = document.createElementNS(ns, spec[0]);
      Object.keys(spec[1]).forEach(function (k) { node.setAttribute(k, spec[1][k]); });
      svg.appendChild(node);
    });
    return svg;
  }

  // ---------- CSP-Safe Markdown / Block Renderer (DOM APIs only) ----------
  function appendInlineFormatted(parent, text) {
    var str = String(text || '');
    var tokenRe = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)|`[^`]+`)/g;
    var last = 0;
    var m;
    while ((m = tokenRe.exec(str)) !== null) {
      if (m.index > last) parent.appendChild(document.createTextNode(str.slice(last, m.index)));
      var tok = m[0];
      if (tok.startsWith('**') && tok.endsWith('**')) {
        parent.appendChild(el('strong', '', tok.slice(2, -2)));
      } else if (tok.startsWith('`') && tok.endsWith('`')) {
        parent.appendChild(el('code', '', tok.slice(1, -1)));
      } else if (tok.startsWith('[')) {
        var lm = tok.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (lm) {
          var href = safeHref(lm[2]);
          if (href) {
            var a = el('a', '', lm[1]);
            a.href = href;
            if (/^https?:\/\//i.test(href)) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
            parent.appendChild(a);
          } else {
            parent.appendChild(document.createTextNode(lm[1]));
          }
        }
      }
      last = tokenRe.lastIndex;
    }
    if (last < str.length) parent.appendChild(document.createTextNode(str.slice(last)));
  }

  function renderProse(container, markdownText) {
    clear(container);
    var lines = String(markdownText || '').split(/\r?\n/);
    var currentUl = null;
    lines.forEach(function (rawLine) {
      var line = rawLine.trim();
      if (!line) { currentUl = null; return; }
      var imgMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
      if (imgMatch) {
        currentUl = null;
        var src = safeHref(imgMatch[2]);
        if (src) {
          var fig = el('figure', 'jp-inline-figure');
          var img = el('img', 'jp-inline-img');
          img.src = src;
          img.alt = imgMatch[1] || '';
          img.loading = 'lazy';
          img.decoding = 'async';
          fig.appendChild(img);
          if (imgMatch[1]) {
            fig.appendChild(el('figcaption', 'jp-inline-caption', imgMatch[1]));
          }
          container.appendChild(fig);
        }
        return;
      }
      if (line.startsWith('### ')) {
        currentUl = null;
        container.appendChild(el('h3', '', line.slice(4)));
        return;
      }
      if (line.startsWith('## ')) {
        currentUl = null;
        container.appendChild(el('h2', '', line.slice(3)));
        return;
      }
      if (line.startsWith('> ')) {
        currentUl = null;
        var box = el('div', 'jp-callout');
        appendInlineFormatted(box, line.slice(2));
        container.appendChild(box);
        return;
      }
      if (line.startsWith('- ') || line.startsWith('* ')) {
        if (!currentUl) {
          currentUl = el('ul');
          container.appendChild(currentUl);
        }
        var li = el('li');
        appendInlineFormatted(li, line.slice(2));
        currentUl.appendChild(li);
        return;
      }
      currentUl = null;
      var p = el('p');
      appendInlineFormatted(p, line);
      container.appendChild(p);
    });
  }

  // ---------- Structured Table Helper ----------
  function buildStructuredTable(title, rows, cols, icsArticle) {
    if (!Array.isArray(rows) || !rows.length) return null;
    var sec = el('section', 'jp-card');
    var calApi = window.CSOCalendarExport;
    var isOr = state.lang === 'or';
    if (icsArticle && calApi && typeof calApi.extractEventsFromJobArticle === 'function') {
      var headRow = el('div', 'cso-ics-table-head');
      headRow.appendChild(el('h2', 'jp-h2', title));
      var bundleEvs = calApi.extractEventsFromJobArticle(icsArticle);
      if (bundleEvs.length >= 2) {
        var bBtn = calApi.createCalendarButton({
          isBundle: true,
          events: bundleEvs,
          filename: icsArticle.slug || icsArticle.id || 'job-dates',
          isOr: isOr,
          labelEn: '📅 Save All ' + bundleEvs.length + ' Key Dates (.ics)',
          labelOr: '📅 ସବୁ ' + bundleEvs.length + ' ତାରିଖ ସେଭ୍ କରନ୍ତୁ (.ics)'
        });
        if (bBtn) headRow.appendChild(bBtn);
      }
      sec.appendChild(headRow);
    } else {
      sec.appendChild(el('h2', 'jp-h2', title));
    }
    var wrap = el('div', 'jp-table-wrap');
    var table = el('table', 'jp-table');
    var thead = el('thead');
    var trH = el('tr');
    cols.forEach(function (c) { trH.appendChild(el('th', '', c[1])); });
    thead.appendChild(trH);
    table.appendChild(thead);
    var tbody = el('tbody');
    rows.forEach(function (r) {
      var tr = el('tr');
      cols.forEach(function (c) {
        var val = r && r[c[0]] !== undefined && r[c[0]] !== null ? String(r[c[0]]) : '—';
        var td = el('td', '', val || '—');
        if (icsArticle && c[0] === 'date' && calApi && typeof calApi.parseDateRange === 'function' && calApi.parseDateRange(val)) {
          var milestoneLbl = String((r && (r.event || r.milestone)) || 'Key Date').trim();
          var evObj = {
            uid: (icsArticle.slug || icsArticle.id || 'job') + '-' + milestoneLbl,
            summary: (icsArticle.title_en || 'Job Notification') + ' — ' + milestoneLbl,
            date: val,
            location: (icsArticle.location_district && !/^all\s+odisha$/i.test(icsArticle.location_district)) ? (icsArticle.location_district + ', Odisha') : 'Odisha / Official Portal',
            url: (window.location.origin || 'https://csodisha.com') + '/jobs/' + encodeURIComponent(icsArticle.slug || ''),
            officialUrl: icsArticle.official_apply_url || icsArticle.notification_pdf_url || icsArticle.official_website_url || '',
            description: (r && r.note ? (r.note + ' · ') : '') + (icsArticle.organisation_en ? ('Authority: ' + icsArticle.organisation_en) : '')
          };
          var rowBtn = calApi.createCalendarButton({
            event: evObj,
            filename: (icsArticle.slug || 'job') + '-' + milestoneLbl,
            isOr: isOr,
            compact: true,
            ariaLabel: 'Add ' + milestoneLbl + ' to calendar (.ics)'
          });
          if (rowBtn) {
            var holder = el('div', 'cso-ics-cell-wrap');
            holder.appendChild(rowBtn);
            td.appendChild(holder);
          }
        }
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrap.appendChild(table);
    sec.appendChild(wrap);
    return sec;
  }

  // ---------- .ics Calendar Download (v389 RFC 5545) ----------
  function downloadJobIcs(article, btnEl) {
    var calApi = window.CSOCalendarExport;
    var isOr = state.lang === 'or';
    if (calApi && typeof calApi.extractEventsFromJobArticle === 'function') {
      var evs = calApi.extractEventsFromJobArticle(article);
      if (evs.length > 1) return calApi.downloadEventBundle(evs, article.slug || article.id, btnEl, isOr);
      if (evs.length === 1) return calApi.downloadSingleEvent(evs[0], article.slug || article.id, btnEl, isOr);
    }
    var item = {
      id: article.slug || article.id,
      title: article.title_en,
      board: article.organisation_en,
      district: article.location_district,
      lastDate: article.last_date || article.exam_date,
      applyUrl: article.official_apply_url || window.location.href
    };
    if (window.CSODeadlineTracker && typeof window.CSODeadlineTracker.downloadIcsReminder === 'function') {
      if (window.CSODeadlineTracker.downloadIcsReminder(item)) return true;
    }
    var dt = String(article.last_date || '').replace(/[^0-9]/g, '');
    if (dt.length !== 8) return false;
    var ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Common Sense Odisha//Jobs Portal//EN',
      'BEGIN:VEVENT',
      'UID:' + (article.slug || article.id) + '@csodisha.com',
      'DTSTART;VALUE=DATE:' + dt,
      'SUMMARY:' + String(article.title_en || 'Job Last Date').replace(/[\r\n,;]/g, ' '),
      'DESCRIPTION:Official Apply Link: ' + (article.official_apply_url || window.location.href),
      'END:VEVENT', 'END:VCALENDAR'
    ].join('\r\n');
    var blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    var u = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = u;
    a.download = (article.slug || 'cso-job') + '-deadline.ics';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(u); }, 1000);
    return true;
  }

  // ---------- Track Exam Lifecycle (Syncs to Candidate Hub /student-dashboard/) ----------
  function trackJobInCandidateHub(article, buttonEl) {
    sendTelemetry('bookmark', article);
    if (window.CSODeadlineTracker && typeof window.CSODeadlineTracker.trackItem === 'function') {
      window.CSODeadlineTracker.trackItem({
        id: article.slug || article.id,
        title: article.title_en,
        board: article.organisation_en,
        district: article.location_district,
        lastDate: article.last_date,
        applyUrl: '/jobs/?slug=' + encodeURIComponent(article.slug)
      });
    }
    fetch('/api/candidate/bookmarks', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'add',
        postId: article.slug || article.id,
        category: 'job',
        postTitle: article.title_en,
        postUrl: '/jobs/?slug=' + encodeURIComponent(article.slug),
        deadlineDate: article.last_date || null
      })
    }).then(function (r) {
      buttonEl.textContent = r.ok ? '✓ Tracked in Candidate Hub' : '✓ Saved Locally (Sign in to Sync)';
    }).catch(function () {
      buttonEl.textContent = '✓ Saved to Tracker';
    });
  }

  // ---------- Inject JobPosting JSON-LD ----------
  function injectJobPostingJsonLd(article) {
    var prev = document.getElementById('cso-job-posting-jsonld');
    if (prev) prev.remove();
    var ld = {
      '@context': 'https://schema.org',
      '@type': 'JobPosting',
      title: article.title_en,
      description: article.summary_en || article.article_body_en || article.title_en,
      datePosted: (article.published_at || article.updated_at || new Date().toISOString()).slice(0, 10),
      validThrough: article.last_date || undefined,
      employmentType: (article.taxonomy && article.taxonomy.l3 && article.taxonomy.l3.title_en) || 'FULL_TIME',
      hiringOrganization: {
        '@type': 'Organization',
        name: article.organisation_en || 'Common Sense Odisha Listed Employer',
        sameAs: article.official_website_url || 'https://csodisha.com'
      },
      jobLocation: {
        '@type': 'Place',
        address: {
          '@type': 'PostalAddress',
          addressLocality: article.location_district || 'Odisha',
          addressRegion: 'Odisha',
          addressCountry: 'IN'
        }
      },
      totalJobOpenings: Number(article.total_vacancies || 0) || undefined
    };
    var script = document.createElement('script');
    script.id = 'cso-job-posting-jsonld';
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(ld);
    document.head.appendChild(script);
  }

  // ---------- Live Candidate Eligibility Evaluator ----------
  function buildEligibilityBanner(article) {
    var box = el('div', 'jp-elig-banner');
    var cand = state.candidate;
    if (!cand) {
      box.classList.add('is-guest');
      box.appendChild(el('div', '', '🎓 Live Eligibility Check: Sign in to your Candidate Hub to verify age relaxation & qualification fit automatically.'));
      var loginA = el('a', 'jp-btn jp-btn--xs jp-btn--cobalt', 'Sign In to Check Eligibility');
      loginA.href = '/login.html';
      box.appendChild(loginA);
      return box;
    }

    var relaxMap = { UR: 0, EWS: 0, SEBC: 5, SC: 5, ST: 5, WOMEN: 5, PWBD: 10 };
    var cat = String(cand.category || 'UR').toUpperCase();
    var relax = relaxMap[cat] || 0;
    var age = Number(cand.age || 0);
    var notes = [];
    var eligible = true;

    if (age > 0 && (article.min_age || article.max_age)) {
      var maxAllowed = Number(article.max_age || 38) + relax;
      var minAllowed = Number(article.min_age || 18);
      if (age >= minAllowed && age <= maxAllowed) {
        notes.push('Age ' + age + ' fits (' + minAllowed + '–' + maxAllowed + ' yrs incl. ' + cat + ' relaxation)');
      } else {
        eligible = false;
        notes.push('Age ' + age + ' outside ' + minAllowed + '–' + maxAllowed + ' yrs limit');
      }
    }
    if (article.qualification_level && cand.qualification) {
      notes.push('Profile: ' + cand.qualification + ' vs Required: ' + article.qualification_level);
    }
    if (article.odisha_domicile_required) {
      notes.push(cand.district ? ('Odisha District: ' + cand.district + ' ✓') : 'Requires Odisha Domicile / Odia proficiency');
    }
    if (!eligible) box.classList.add('is-warn');
    box.appendChild(el('div', '', (eligible ? '✅ Likely Eligible for ' : '⚠️ Check Criteria for ') + (cand.fullName || 'Candidate') + (notes.length ? (' — ' + notes.join(' · ')) : '')));
    var hubA = el('a', 'jp-btn jp-btn--xs', 'Open Candidate Hub →');
    hubA.href = '/student-dashboard/';
    box.appendChild(hubA);
    return box;
  }

  // ---------- Lang Switcher Component ----------
  function buildLangToggle(onSwitch) {
    var wrap = el('div', 'jp-lang-toggle');
    wrap.setAttribute('role', 'group');
    wrap.setAttribute('aria-label', 'Language switch');
    [['en', 'English'], ['or', 'ଓଡ଼ିଆ']].forEach(function (pair) {
      var b = el('button', 'jp-lang-btn' + (state.lang === pair[0] ? ' is-active' : ''), pair[1]);
      b.type = 'button';
      b.setAttribute('aria-pressed', String(state.lang === pair[0]));
      b.addEventListener('click', function () {
        setLangPref(pair[0]);
        onSwitch();
      });
      wrap.appendChild(b);
    });
    return wrap;
  }

  // ======================================================================
  // RENDER FULL VISUAL ARTICLE + DRAFT PREVIEW
  // ======================================================================
  function renderArticleView(mount, payload) {
    activatePortalShell();
    clear(mount);
    var a = payload.article;
    var wrap = el('div', 'jp-article');
    document.title = (pick(a, 'title') || a.title_en) + ' | CS Odisha Jobs';

    // 0. Print-Only Clean-Sheet Masthead (v390)
    var canonicalJobUrl = (window.location.origin || 'https://csodisha.com') + '/jobs/' + encodeURIComponent(a.slug || '');
    var printHead = el('div', 'cso-print-masthead');
    printHead.appendChild(el('strong', 'cso-print-masthead__brand', 'Common Sense Odisha (csodisha.com)'));
    printHead.appendChild(el('span', 'cso-print-masthead__url', canonicalJobUrl));
    wrap.appendChild(printHead);

    // 1. Floating Admin Draft Preview Banner
    if (payload.is_preview) {
      var pv = el('div', 'jp-preview-banner');
      pv.setAttribute('role', 'status');
      var left = el('div', 'jp-pills-row');
      left.appendChild(el('span', 'jp-preview-badge', 'DRAFT PREVIEW'));
      var expText = '';
      if (payload.preview_expires_at) {
        var mins = Math.max(1, Math.round((Date.parse(payload.preview_expires_at) - Date.now()) / 60000));
        expText = mins > 60 ? ('Expires in ~' + Math.ceil(mins / 60) + 'h') : ('Expires in ' + mins + 'm');
      }
      left.appendChild(el('span', '', 'ADMIN DRAFT PREVIEW — Not Yet Public' + (expText ? ' (' + expText + ')' : '')));
      pv.appendChild(left);
      var backAdmin = el('a', 'jp-btn jp-btn--xs', 'Back to Admin Studio');
      backAdmin.href = '/admin/#folder-jobs-careers';
      pv.appendChild(backAdmin);
      wrap.appendChild(pv);
    }

    // 2. Top Navigation + Breadcrumbs + Lang Switch
    var topBar = el('div', 'jp-article-top');
    var crumbs = el('nav', 'jp-breadcrumbs');
    crumbs.setAttribute('aria-label', 'Job Taxonomy Breadcrumb');
    var backJobs = el('a', '', '← All Jobs & Careers');
    backJobs.href = '/jobs/';
    crumbs.appendChild(backJobs);
    if (a.taxonomy && a.taxonomy.l1) { crumbs.appendChild(el('span', '', '›')); crumbs.appendChild(el('span', '', pick(a.taxonomy.l1, 'title'))); }
    if (a.taxonomy && a.taxonomy.l2) { crumbs.appendChild(el('span', '', '›')); crumbs.appendChild(el('span', '', pick(a.taxonomy.l2, 'title'))); }
    if (a.taxonomy && a.taxonomy.l3) { crumbs.appendChild(el('span', '', '›')); crumbs.appendChild(el('span', '', pick(a.taxonomy.l3, 'title'))); }
    topBar.appendChild(crumbs);
    topBar.appendChild(buildLangToggle(function () { renderArticleView(mount, payload); }));
    wrap.appendChild(topBar);

    // 3. Corrigendum Alert
    var corNote = pick(a, 'corrigendum_note');
    if (corNote) {
      var cor = el('section', 'jp-corrigendum');
      cor.setAttribute('role', 'alert');
      cor.appendChild(el('strong', '', '⚠️ Official Corrigendum / Important Update'));
      cor.appendChild(el('div', '', corNote));
      wrap.appendChild(cor);
    }

    // 4. Hero Card with Cover Banner, Title, Status & Actions
    var heroCard = el('article', 'jp-card');
    if (a.cover_image_url && safeHref(a.cover_image_url)) {
      var fig = el('figure', 'jp-cover-figure');
      var img = el('img', 'jp-cover-img');
      img.src = safeHref(a.cover_image_url);
      img.alt = a.cover_image_caption || a.title_en;
      fig.appendChild(img);
      if (a.cover_image_caption) fig.appendChild(el('figcaption', 'jp-cover-caption', a.cover_image_caption));
      heroCard.appendChild(fig);
    }

    var badgeRow = el('div', 'jp-pills-row');
    badgeRow.appendChild(el('span', 'jp-badge ' + (a.is_expired ? 'jp-badge--closed' : (a.days_remaining !== null && a.days_remaining <= 7 ? 'jp-badge--urgent' : 'jp-badge--active')), a.status_badge || 'Active'));
    if (a.sector_badge) badgeRow.appendChild(el('span', 'jp-badge', a.sector_badge));
    if (a.advt_number) badgeRow.appendChild(el('span', 'jp-badge', a.advt_number));
    if (a.is_official_gov_url) badgeRow.appendChild(el('span', 'jp-badge jp-badge--gov', '✓ Verified .gov.in Link'));
    heroCard.appendChild(badgeRow);

    heroCard.appendChild(el('h1', 'jp-article-h1', pick(a, 'title') || a.title_en));
    if (pick(a, 'organisation')) heroCard.appendChild(el('div', 'jp-muted', 'Conducting Authority: ' + pick(a, 'organisation') + (a.location_district ? ' · ' + a.location_district : '')));
    if (pick(a, 'summary')) heroCard.appendChild(el('p', '', pick(a, 'summary')));

    // Action Toolbar
    var actRow = el('div', 'jp-pills-row');
    if (a.official_apply_url && safeHref(a.official_apply_url)) {
      var applyA = el('a', 'jp-btn jp-btn--apply', 'Apply Online (Official Portal) ↗');
      applyA.href = safeHref(a.official_apply_url);
      applyA.target = '_blank';
      applyA.rel = 'noopener noreferrer';
      applyA.addEventListener('click', function () { sendTelemetry('apply_click', a); });
      actRow.appendChild(applyA);
    }
    var trackBtn = el('button', 'jp-btn jp-btn--cobalt', '🔖 Track Exam Lifecycle');
    trackBtn.type = 'button';
    trackBtn.addEventListener('click', function () { trackJobInCandidateHub(a, trackBtn); });
    actRow.appendChild(trackBtn);

    var jobCalEvents = (window.CSOCalendarExport && typeof window.CSOCalendarExport.extractEventsFromJobArticle === 'function')
      ? window.CSOCalendarExport.extractEventsFromJobArticle(a)
      : [];
    if (jobCalEvents.length || a.last_date || a.exam_date) {
      var isOrLang = state.lang === 'or';
      var icsLabel = jobCalEvents.length > 1
        ? (isOrLang ? ('📅 ସବୁ ' + jobCalEvents.length + ' ମୁଖ୍ୟ ତାରିଖ ସେଭ୍ କରନ୍ତୁ (.ics)') : ('📅 Save All ' + jobCalEvents.length + ' Key Dates (.ics)'))
        : (isOrLang ? '📅 କ୍ୟାଲେଣ୍ଡରରେ ଯୋଡନ୍ତୁ (.ics)' : '📅 Add to Calendar (.ics)');
      var icsBtn = el('button', 'jp-btn cso-ics-btn' + (jobCalEvents.length > 1 ? ' cso-ics-btn--bundle' : ''), icsLabel);
      icsBtn.type = 'button';
      icsBtn.setAttribute('data-cso-ics-btn', jobCalEvents.length > 1 ? 'bundle' : 'single');
      icsBtn.addEventListener('click', function () { downloadJobIcs(a, icsBtn); });
      actRow.appendChild(icsBtn);
    }
    var printBtn = el('button', 'jp-btn cso-print-btn', state.lang === 'or' ? '🖨️ ପ୍ରିଣ୍ଟ / PDF ସେଭ୍ କରନ୍ତୁ' : '🖨️ Print / Save Clean Guide');
    printBtn.type = 'button';
    printBtn.setAttribute('data-cso-print-btn', '1');
    printBtn.setAttribute('aria-label', state.lang === 'or' ? 'ପ୍ରିଣ୍ଟ କିମ୍ବା PDF ସେଭ୍ କରନ୍ତୁ' : 'Print or save clean PDF guide');
    printBtn.addEventListener('click', function () { window.print(); });
    actRow.appendChild(printBtn);
    if (window.CSOSavedAlerts && typeof window.CSOSavedAlerts.createBookmarkButton === 'function') {
      var saveDetailBtn = window.CSOSavedAlerts.createBookmarkButton({
        id: 'job:' + (a.slug || a.id),
        slug: a.slug || a.id,
        url: '/jobs/' + encodeURIComponent(a.slug || ''),
        title_en: a.title_en,
        title_or: a.title_or || '',
        org: a.organisation_en || a.sector_badge || 'Odisha Govt',
        category: a.lifecycle_stage === 'result' ? 'result' : (a.lifecycle_stage === 'admit_card' || a.lifecycle_stage === 'exam_date' ? 'exam_update' : 'job_alert'),
        deadline_iso: a.last_date || a.exam_date || '',
        deadline_label: /walk-?in/i.test(a.title_en || '') ? 'Walk-in Interview' : 'Last Date',
        venue_or_mode: a.location_district || 'Odisha / Official Portal',
        official_url: a.official_apply_url || a.notification_pdf_url || a.official_website_url || ''
      }, { isOr: state.lang === 'or', extraClass: 'jp-btn' });
      if (saveDetailBtn) actRow.appendChild(saveDetailBtn);
    }
    if (a.official_website_url && safeHref(a.official_website_url)) {
      var webA = el('a', 'jp-btn', 'Official Website ↗');
      webA.href = safeHref(a.official_website_url);
      webA.target = '_blank';
      webA.rel = 'noopener noreferrer';
      actRow.appendChild(webA);
    }
    heroCard.appendChild(actRow);
    wrap.appendChild(heroCard);

    // 5. Lifecycle Stage Timeline Bar
    var tlCard = el('section', 'jp-card');
    tlCard.appendChild(el('h2', 'jp-h2', 'Exam Lifecycle Stage'));
    var tlBar = el('div', 'jp-timeline');
    var curIdx = STAGE_ORDER.findIndex(function (s) { return s[0] === a.lifecycle_stage; });
    if (curIdx === -1) curIdx = a.lifecycle_stage === 'closed' ? 4 : 0;
    STAGE_ORDER.forEach(function (st, idx) {
      var cls = 'jp-stage-step' + (idx < curIdx ? ' is-done' : (idx === curIdx ? ' is-current' : ''));
      tlBar.appendChild(el('div', cls, st[1]));
    });
    tlCard.appendChild(tlBar);
    if (Array.isArray(a.lifecycle_updates) && a.lifecycle_updates.length) {
      var updList = el('div', 'jp-prose');
      a.lifecycle_updates.forEach(function (u) {
        var row = el('div', 'jp-callout');
        row.appendChild(el('strong', '', (u.is_corrigendum ? '[CORRIGENDUM] ' : '') + (u.date ? u.date + ' — ' : '') + (u.headline || u.stage || 'Update')));
        if (u.pdf_url && safeHref(u.pdf_url)) {
          row.appendChild(document.createTextNode(' · '));
          var la = el('a', '', 'Open Official PDF ↗');
          la.href = safeHref(u.pdf_url);
          la.target = '_blank';
          la.rel = 'noopener noreferrer';
          la.addEventListener('click', function () { sendTelemetry('pdf_download', a); });
          row.appendChild(la);
        }
        updList.appendChild(row);
      });
      tlCard.appendChild(updList);
    }
    wrap.appendChild(tlCard);

    // 6. 6 Color-Coded At-a-Glance Highlight Tiles
    var tiles = el('section', 'jp-tiles-grid');
    tiles.setAttribute('aria-label', 'At-a-Glance Highlights');
    [
      ['Total Posts', a.total_vacancies ? num(a.total_vacancies) + ' Vacancies' : 'See Notification', 'emerald'],
      ['Pay Scale / Salary', a.salary_pay_scale || 'As per Govt. Pay Matrix', 'cobalt'],
      ['Last Date Countdown', a.last_date ? (a.last_date + ' (' + a.status_badge + ')') : a.status_badge, 'rose'],
      ['Qualification', a.qualification_summary || a.qualification_level || 'Check Eligibility', 'violet'],
      ['Age Limit', a.age_limit_summary || ((a.min_age || a.max_age) ? ((a.min_age || 18) + '–' + (a.max_age || 38) + ' Years') : 'As per Rules'), 'amber'],
      ['Selection Mode', a.selection_mode || 'Written Exam / Interview', 'teal']
    ].forEach(function (t) {
      var tile = el('div', 'jp-tile jp-tile--' + t[2]);
      tile.appendChild(el('span', 'jp-tile-label', t[0]));
      tile.appendChild(el('strong', 'jp-tile-val', t[1]));
      tiles.appendChild(tile);
    });
    wrap.appendChild(tiles);

    // 7. Live Candidate Eligibility Banner
    wrap.appendChild(buildEligibilityBanner(a));

    // 8. Rich Bilingual Article Body
    var bodyContent = pick(a, 'article_body');
    if (bodyContent) {
      var proseCard = el('section', 'jp-card');
      proseCard.appendChild(el('h2', 'jp-h2', state.lang === 'or' ? 'ବିସ୍ତୃତ ବିଜ୍ଞପ୍ତି ବିବରଣୀ' : 'Detailed Notification Guide'));
      var prose = el('div', 'jp-prose');
      renderProse(prose, bodyContent);
      proseCard.appendChild(prose);
      wrap.appendChild(proseCard);
    }

    // 8b. v402: Interactive Exam Fee & Category-Wise Vacancy Visualizer (detail view only)
    var vfvMount = el('section', 'cso-vfv-root');
    vfvMount.id = 'cso-vacancy-fee-viz-root';
    vfvMount.setAttribute('data-job-slug', String(a.slug || ''));
    wrap.appendChild(vfvMount);
    if (window.CSOJobVacancyFeeViz && typeof window.CSOJobVacancyFeeViz.mount === 'function') {
      window.CSOJobVacancyFeeViz.mount(vfvMount, a, { isOr: state.lang === 'or' });
    }

    // 9. Structured Tables (Vacancies, Important Dates, Fee Structure, Selection Steps, Cutoff Reference)
    var tables = [
      buildStructuredTable('Post-wise Vacancy & Qualification Breakdown', a.vacancy_breakdown, [['post_name', 'Post / Cadre'], ['vacancies', 'Vacancies'], ['qualification', 'Qualification'], ['pay_level', 'Pay Scale']]),
      buildStructuredTable('Important Dates Timeline', a.important_dates, [['event', 'Milestone'], ['date', 'Date'], ['note', 'Remarks']], a),
      buildStructuredTable('Application Fee by Category', a.fee_structure, [['category', 'Category'], ['amount', 'Fee Amount'], ['payment_mode', 'Payment Mode']]),
      buildStructuredTable('Selection Process Steps', a.selection_steps, [['step', 'Step'], ['stage_name', 'Stage'], ['marks_duration', 'Marks / Duration'], ['details', 'Details']]),
      buildStructuredTable('Previous Cycle Cutoff & Vacancy Reference', a.cutoff_reference, [['year', 'Year'], ['category', 'Category'], ['vacancies', 'Prev Vacancies'], ['cutoff_marks', 'Cutoff Marks']])
    ];
    tables.forEach(function (t) { if (t) wrap.appendChild(t); });

    // 10. Inline PDF Viewer with Quick-Jump Page Bookmarks + Download Cards
    var pdfList = [];
    if (a.notification_pdf_url && safeHref(a.notification_pdf_url)) pdfList.push({ title: 'Official Notification PDF', url: safeHref(a.notification_pdf_url) });
    if (a.syllabus_pdf_url && safeHref(a.syllabus_pdf_url)) pdfList.push({ title: 'Official Syllabus & Exam Pattern PDF', url: safeHref(a.syllabus_pdf_url) });
    (a.extra_attachments || []).forEach(function (att) {
      if (att && att.url && safeHref(att.url)) pdfList.push({ title: att.title || 'Annexure PDF', url: safeHref(att.url) });
    });

    if (pdfList.length) {
      var pdfSec = el('section', 'jp-card');
      pdfSec.appendChild(el('h2', 'jp-h2', 'Official PDFs & Inline Document Viewer'));
      var cardsRow = el('div', 'jp-pdf-cards');
      if (!state.activePdfUrl) state.activePdfUrl = pdfList[0].url;

      var frameWrap = el('div', '');
      function mountPdfFrame(url, pageNum) {
        clear(frameWrap);
        var isSameOrigin = url.startsWith('/api/media/') || url.indexOf(window.location.origin) === 0;
        if (isSameOrigin) {
          var iframe = el('iframe', 'jp-pdf-frame');
          iframe.title = 'Official Notification PDF Viewer';
          iframe.src = url + (pageNum > 1 ? ('#page=' + pageNum) : '');
          frameWrap.appendChild(iframe);
        } else {
          var note = el('div', 'jp-callout');
          note.appendChild(el('span', '', 'External official PDF hosted at source portal. '));
          var extA = el('a', '', 'Open PDF in New Tab ↗');
          extA.href = url + (pageNum > 1 ? ('#page=' + pageNum) : '');
          extA.target = '_blank';
          extA.rel = 'noopener noreferrer';
          note.appendChild(extA);
          frameWrap.appendChild(note);
        }
      }

      pdfList.forEach(function (pdf) {
        var c = el('div', 'jp-pdf-card');
        c.appendChild(el('strong', '', '📄 ' + pdf.title));
        var pActs = el('div', 'jp-pills-row');
        var viewBtn = el('button', 'jp-btn jp-btn--xs jp-btn--primary', 'View Inline');
        viewBtn.type = 'button';
        viewBtn.addEventListener('click', function () {
          state.activePdfUrl = pdf.url;
          state.activePdfPage = 1;
          mountPdfFrame(pdf.url, 1);
        });
        pActs.appendChild(viewBtn);
        var dlA = el('a', 'jp-btn jp-btn--xs', '⬇ Download PDF');
        dlA.href = pdf.url;
        dlA.target = '_blank';
        dlA.rel = 'noopener noreferrer';
        dlA.addEventListener('click', function () { sendTelemetry('pdf_download', a); });
        pActs.appendChild(dlA);
        c.appendChild(pActs);
        cardsRow.appendChild(c);
      });
      pdfSec.appendChild(cardsRow);

      if (Array.isArray(a.pdf_index_bookmarks) && a.pdf_index_bookmarks.length) {
        var bmRow = el('div', 'jp-pills-row');
        bmRow.appendChild(el('span', 'jp-label', 'Quick-Jump Bookmarks:'));
        a.pdf_index_bookmarks.forEach(function (bm) {
          var pg = Math.max(1, Number(bm.page || 1));
          var b = el('button', 'jp-filter-pill', (bm.label || ('Page ' + pg)));
          b.type = 'button';
          b.addEventListener('click', function () {
            state.activePdfPage = pg;
            mountPdfFrame(state.activePdfUrl, pg);
          });
          bmRow.appendChild(b);
        });
        pdfSec.appendChild(bmRow);
      }

      mountPdfFrame(state.activePdfUrl, state.activePdfPage);
      pdfSec.appendChild(frameWrap);
      wrap.appendChild(pdfSec);
    }

    // 11. "Prepare for This Exam" Study / Mock Kit
    var studyItems = payload.linked_study_items || [];
    if (studyItems.length) {
      var kitSec = el('section', 'jp-card');
      kitSec.appendChild(el('h2', 'jp-h2', '📚 Prepare for This Exam (Study Library & Mock Tests)'));
      var kitGrid = el('div', 'jp-kit-grid');
      studyItems.forEach(function (si) {
        var kc = el('div', 'jp-kit-card');
        kc.appendChild(el('span', 'jp-badge', si.kind || 'Study Kit'));
        kc.appendChild(el('strong', '', si.title));
        if (si.summary) kc.appendChild(el('div', 'jp-muted', si.summary));
        var ka = el('a', 'jp-btn jp-btn--xs jp-btn--primary', 'Open Resource →');
        ka.href = safeHref(si.url) || '/study-library/';
        kc.appendChild(ka);
        kitGrid.appendChild(kc);
      });
      kitSec.appendChild(kitGrid);
      wrap.appendChild(kitSec);
    }

    // 11a. v397: Interactive Application Document Checklist & Age Eligibility Quick-Checker (detail view only)
    var readinessMount = el('section', 'cso-jr-root');
    readinessMount.id = 'cso-job-readiness-root';
    readinessMount.setAttribute('data-job-slug', String(a.slug || ''));
    wrap.appendChild(readinessMount);

    // 11b. v387: Interactive 25-MCQ "Test Yourself" Practice Drill (detail view only)
    var quizMount = el('section', 'cso-aq-root');
    quizMount.id = 'cso-article-quiz-root';
    quizMount.setAttribute('data-quiz-type', 'job');
    quizMount.setAttribute('data-quiz-slug', String(a.slug || ''));
    wrap.appendChild(quizMount);

    // 12. Related Active Jobs (up to 3)
    var related = payload.related_jobs || [];
    if (related.length) {
      var relSec = el('section', 'jp-card jp-related-card');
      relSec.appendChild(el('h2', 'jp-h2', 'Related Active Opportunities'));
      var relGrid = el('div', 'jp-jobs-grid');
      related.forEach(function (r) { relGrid.appendChild(buildJobCard(r)); });
      relSec.appendChild(relGrid);
      wrap.appendChild(relSec);
    }

    // 13. Print-Only Clean-Sheet Attribution Footer (v390)
    var printFoot = el('div', 'cso-print-footer');
    printFoot.textContent = 'Source: Common Sense Odisha (csodisha.com) · ' + canonicalJobUrl;
    wrap.appendChild(printFoot);

    mount.appendChild(wrap);
    if (window.CSOJobReadiness && typeof window.CSOJobReadiness.mount === 'function') {
      window.CSOJobReadiness.mount(readinessMount, a, state.lang);
    }
    if (window.CSOArticleMiniQuiz && typeof window.CSOArticleMiniQuiz.mount === 'function') {
      window.CSOArticleMiniQuiz.mount(quizMount);
    }
    injectJobPostingJsonLd(a);
  }

  // ======================================================================
  // HIGH-CONTRAST RECRUITMENT CARD BUILDER (v254)
  // ======================================================================
  function buildJobCard(job) {
    var card = el('article', 'jp-job-card');
    if (job.cover_image_url && safeHref(job.cover_image_url)) {
      var thumb = el('img', 'jp-job-thumb');
      thumb.src = safeHref(job.cover_image_url);
      thumb.alt = job.title_en;
      thumb.loading = 'lazy';
      thumb.decoding = 'async';
      card.appendChild(thumb);
    }
    var body = el('div', 'jp-job-card-body');

    // Top badge row: Sector, Lifecycle Stage, Countdown & Verified .gov.in
    var meta = el('div', 'jp-pills-row');
    var countdownCls = job.is_expired ? 'jp-badge--closed' : (job.days_remaining !== null && job.days_remaining <= 7 ? 'jp-badge--urgent' : 'jp-badge--active');
    meta.appendChild(el('span', 'jp-badge ' + countdownCls, job.status_badge || 'Active'));
    if (job.lifecycle_stage && STAGE_LABELS[job.lifecycle_stage]) {
      meta.appendChild(el('span', 'jp-badge jp-badge--stage', STAGE_LABELS[job.lifecycle_stage]));
    }
    if (job.sector_badge) {
      meta.appendChild(el('span', 'jp-badge', job.sector_badge));
    } else if (job.taxonomy && job.taxonomy.l1) {
      meta.appendChild(el('span', 'jp-badge', pick(job.taxonomy.l1, 'title')));
    }
    if (job.total_vacancies) {
      meta.appendChild(el('span', 'jp-badge jp-badge--vacancies', num(job.total_vacancies) + ' Vacancies'));
    }
    if (job.is_official_gov_url) {
      meta.appendChild(el('span', 'jp-badge jp-badge--gov', '✓ .gov.in'));
    }
    body.appendChild(meta);

    // Organisation line
    var orgText = pick(job, 'organisation') || (job.taxonomy && job.taxonomy.l2 ? pick(job.taxonomy.l2, 'title') : '');
    if (orgText) {
      body.appendChild(el('div', 'jp-job-org', orgText + (job.advt_number ? ' · ' + job.advt_number : '')));
    }

    // Headline
    var h3 = el('h3', 'jp-job-title');
    var a = el('a', '', pick(job, 'title') || job.title_en);
    a.href = '/jobs/?slug=' + encodeURIComponent(job.slug);
    h3.appendChild(a);
    body.appendChild(h3);

    // Structured fact grid: Qualification, Age Limit, Location & Last Date
    var facts = el('div', 'jp-job-facts');
    var factRows = [
      [state.lang === 'or' ? 'ଯୋଗ୍ୟତା' : 'Qualification', job.qualification_summary || job.qualification_level || 'See Notification'],
      [state.lang === 'or' ? 'ବୟସ ସୀମା' : 'Age Limit', job.age_limit_summary || ((job.min_age || job.max_age) ? ((job.min_age || 18) + '–' + (job.max_age || 38) + ' Yrs') : 'As per Rules')],
      [state.lang === 'or' ? 'ଅନ୍ତିମ ତାରିଖ' : 'Last Date', job.last_date || (job.exam_date ? 'Exam: ' + job.exam_date : 'Open')],
      [state.lang === 'or' ? 'ସ୍ଥାନ' : 'Location / Tenure', [job.location_district || 'Odisha', job.taxonomy && job.taxonomy.l3 ? pick(job.taxonomy.l3, 'title') : ''].filter(Boolean).join(' · ')]
    ];
    factRows.forEach(function (pair) {
      var cell = el('div', 'jp-job-fact');
      cell.appendChild(el('span', 'jp-job-fact-k', pair[0]));
      cell.appendChild(el('span', 'jp-job-fact-v', pair[1]));
      facts.appendChild(cell);
    });
    body.appendChild(facts);

    if (pick(job, 'summary')) {
      body.appendChild(el('div', 'jp-muted', pick(job, 'summary').slice(0, 155)));
    }

    var foot = el('div', 'jp-job-foot');
    var readA = el('a', 'jp-btn jp-btn--xs jp-btn--primary', state.lang === 'or' ? 'ସମ୍ପୂର୍ଣ୍ଣ ବିଜ୍ଞପ୍ତି ଦେଖନ୍ତୁ →' : 'View Full Notification →');
    readA.href = '/jobs/?slug=' + encodeURIComponent(job.slug);
    foot.appendChild(readA);

    if (job.official_apply_url && safeHref(job.official_apply_url) && !job.is_expired) {
      var appA = el('a', 'jp-btn jp-btn--xs', state.lang === 'or' ? 'ଅନଲାଇନ୍ ଆବେଦନ ↗' : 'Apply Online ↗');
      appA.href = safeHref(job.official_apply_url);
      appA.target = '_blank';
      appA.rel = 'noopener noreferrer';
      foot.appendChild(appA);
    }
    if (window.CSOSavedAlerts && typeof window.CSOSavedAlerts.createBookmarkButton === 'function') {
      var saveCardBtn = window.CSOSavedAlerts.createBookmarkButton({
        id: 'job:' + (job.slug || job.id),
        slug: job.slug || job.id,
        url: '/jobs/' + encodeURIComponent(job.slug || ''),
        title_en: job.title_en,
        title_or: job.title_or || '',
        org: job.organisation_en || job.sector_badge || 'Odisha Govt',
        category: job.lifecycle_stage === 'result' ? 'result' : (job.lifecycle_stage === 'admit_card' || job.lifecycle_stage === 'exam_date' ? 'exam_update' : 'job_alert'),
        deadline_iso: job.last_date || job.exam_date || '',
        deadline_label: /walk-?in/i.test(job.title_en || '') ? 'Walk-in Interview' : 'Last Date',
        venue_or_mode: job.location_district || 'Odisha / Official Portal',
        official_url: job.official_apply_url || ''
      }, { isOr: state.lang === 'or', compact: true });
      if (saveCardBtn) foot.appendChild(saveCardBtn);
    }
    body.appendChild(foot);
    card.appendChild(body);
    return card;
  }

  // ======================================================================
  // FLAGSHIP EDITORIAL HERO + 3-LAYER INTERACTIVE EXPLORER (v254)
  // ======================================================================
  function computeHeroKpis() {
    var src = state.allItems.length ? state.allItems : state.items;
    var activeCount = 0;
    var totalVacancies = 0;
    var closingSoon = 0;
    src.forEach(function (j) {
      if (!j.is_expired) activeCount++;
      totalVacancies += Number(j.total_vacancies || 0);
      if (!j.is_expired && j.days_remaining !== null && j.days_remaining !== undefined && Number(j.days_remaining) >= 0 && Number(j.days_remaining) <= 7) {
        closingSoon++;
      }
    });
    var deptCount = state.nodes.filter(function (n) { return Number(n.level) === 2; }).length;
    return {
      activeCount: activeCount,
      totalVacancies: totalVacancies,
      closingSoon: closingSoon,
      deptCount: deptCount
    };
  }

  function renderDepartmentsDirectory(wrap, mount) {
    var l2Nodes = state.nodes.filter(function (n) {
      return Number(n.level) === 2 && (!state.filters.l1 || n.parent_id === state.filters.l1);
    });
    if (!l2Nodes.length) return;

    var l1Map = {};
    state.nodes.forEach(function (n) { if (Number(n.level) === 1) l1Map[n.id] = n; });

    var sec = el('section', 'jp-dept-section');
    sec.setAttribute('aria-label', 'Browse 3-Layer Recruitment Departments & Boards');
    var head = el('div', 'jp-card-head');
    var hl = el('div');
    hl.appendChild(el('h2', 'jp-h2', state.lang === 'or' ? '୩-ସ୍ତରୀୟ ବିଭାଗ ଏବଂ ନିଯୁକ୍ତି ବୋର୍ଡ ବ୍ରାଉଜ୍ କରନ୍ତୁ' : 'Browse 3-Layer Departments & Recruiting Boards'));
    hl.appendChild(el('div', 'jp-muted', state.lang === 'or' ? 'ବିଭାଗ ଅନୁଯାୟୀ ଚାକିରି ଫିଲ୍ଟର୍ କରିବାକୁ ଯେକୌଣସି ବୋର୍ଡ ଚୟନ କରନ୍ତୁ।' : 'Select any commission, board, or sector track to filter verified notifications instantly.'));
    head.appendChild(hl);
    sec.appendChild(head);

    var grid = el('div', 'jp-dept-grid');
    l2Nodes.forEach(function (d) {
      var parent = l1Map[d.parent_id];
      var card = el('button', 'jp-dept-card' + (state.filters.l2 === d.id ? ' is-active' : ''));
      card.type = 'button';
      var top = el('div', 'jp-dept-top');
      top.appendChild(el('span', 'jp-badge', (d.icon ? d.icon + ' ' : '') + (parent ? pick(parent, 'title') : 'Board')));
      top.appendChild(el('span', 'jp-badge jp-badge--active', num(d.published_jobs_count || 0) + ' Live'));
      card.appendChild(top);
      card.appendChild(el('div', 'jp-dept-title', pick(d, 'title')));
      if (pick(d, 'subtitle')) card.appendChild(el('div', 'jp-dept-sub', pick(d, 'subtitle')));
      card.addEventListener('click', function () {
        state.filters.l1 = d.parent_id || '';
        state.filters.l2 = d.id;
        state.filters.l3 = '';
        loadPortalJobs(mount);
      });
      grid.appendChild(card);
    });
    sec.appendChild(grid);
    wrap.appendChild(sec);
  }

  function renderPortalListing(mount) {
    activatePortalShell();
    var hasFilter = Boolean(state.filters.l1 || state.filters.l2 || state.filters.l3 || state.filters.region || state.filters.district || state.filters.qualification || state.filters.stage || state.filters.search);

    var wrap = el('div', 'jp-portal');

    // 1. Compact Editorial Hero Header (v281)
    var hero = el('section', 'jp-hero jp-hero--compact');
    hero.setAttribute('aria-label', 'Verified Jobs & Recruitment Notifications');
    var heroTop = el('div', 'jp-hero-top');
    var copy = el('div', 'jp-hero-copy');
    copy.appendChild(el('h1', 'jp-hero-title', state.lang === 'or'
      ? 'ଯାଞ୍ଚିତ ନିଯୁକ୍ତି ବିଜ୍ଞପ୍ତି'
      : 'Verified Jobs & Recruitment Notifications'));
    copy.appendChild(el('p', 'jp-hero-sub', state.lang === 'or'
      ? 'ଓଡ଼ିଶା ସରକାରୀ, କେନ୍ଦ୍ରୀୟ, PSU, NGO ଏବଂ ବିଦେଶୀ ନିଯୁକ୍ତି ସୁଯୋଗ।'
      : 'Official Odisha State, Central, PSU, NGO & Foreign job openings.'));
    heroTop.appendChild(copy);
    heroTop.appendChild(buildLangToggle(function () { renderPortalListing(mount); }));
    hero.appendChild(heroTop);
    wrap.appendChild(hero);

    // 2. Streamlined Single-Card Filter Bar (Sector Tabs + Compact 1-Row Controls)
    var filterSec = el('section', 'jp-card');
    filterSec.setAttribute('aria-label', 'Jobs Filter Explorer');

    var l1Nodes = state.nodes.filter(function (n) { return Number(n.level) === 1; });
    if (l1Nodes.length) {
      var sectorStrip = el('div', 'jp-sector-strip');
      sectorStrip.setAttribute('role', 'group');
      sectorStrip.setAttribute('aria-label', 'Filter by Recruitment Sector');

      var allSectorBtn = el('button', 'jp-sector-card' + (!state.filters.l1 ? ' is-active' : ''));
      allSectorBtn.type = 'button';
      var allLeft = el('span', 'jp-sector-left');
      allLeft.appendChild(el('span', 'jp-sector-icon', '🏛️'));
      allLeft.appendChild(el('span', 'jp-sector-name', state.lang === 'or' ? 'ସମସ୍ତ କ୍ଷେତ୍ର' : 'All Sectors'));
      allSectorBtn.appendChild(allLeft);
      allSectorBtn.appendChild(el('span', 'jp-sector-count', num(state.allItems.length || state.items.length)));
      allSectorBtn.addEventListener('click', function () {
        state.filters.l1 = ''; state.filters.l2 = ''; state.filters.l3 = '';
        loadPortalJobs(mount);
      });
      sectorStrip.appendChild(allSectorBtn);

      l1Nodes.forEach(function (n) {
        var b = el('button', 'jp-sector-card' + (state.filters.l1 === n.id ? ' is-active' : ''));
        b.type = 'button';
        var left = el('span', 'jp-sector-left');
        left.appendChild(el('span', 'jp-sector-icon', n.icon || '💼'));
        left.appendChild(el('span', 'jp-sector-name', pick(n, 'title')));
        b.appendChild(left);
        b.appendChild(el('span', 'jp-sector-count', num(n.published_jobs_count || 0)));
        b.addEventListener('click', function () {
          state.filters.l1 = n.id; state.filters.l2 = ''; state.filters.l3 = '';
          if (String(n.slug || '').toLowerCase() === 'foreign' && ['odisha', 'central', 'all-india'].indexOf(state.filters.region) !== -1) {
            state.filters.region = '';
          }
          loadPortalJobs(mount);
        });
        sectorStrip.appendChild(b);
      });
      filterSec.appendChild(sectorStrip);
    }

    var l1NodeActive = findNodeById(state.nodes, state.filters.l1);
    var isForeignSectorActive = Boolean(l1NodeActive && String(l1NodeActive.slug || '').toLowerCase() === 'foreign');
    if (isForeignSectorActive && ['odisha', 'central', 'all-india'].indexOf(state.filters.region) !== -1) {
      state.filters.region = '';
    }

    var filterRow = el('div', 'jp-filter-row' + (isForeignSectorActive ? ' is-no-scope' : ''));

    var qField = el('div', 'jp-field');
    var qInp = el('input', 'jp-input');
    qInp.id = 'jp-portal-search';
    qInp.type = 'search';
    qInp.setAttribute('aria-label', 'Search jobs by post, board, or keyword');
    qInp.placeholder = state.lang === 'or' ? 'ପଦବୀ, ବୋର୍ଡ କିମ୍ବା କୀୱାର୍ଡ ଖୋଜନ୍ତୁ...' : 'Search by post, board, or keyword...';
    qInp.value = state.filters.search;
    var timer = null;
    qInp.addEventListener('input', function () {
      state.filters.search = qInp.value.trim();
      clearTimeout(timer);
      timer = setTimeout(function () { loadPortalJobs(mount); }, 180);
    });
    qField.appendChild(qInp);
    filterRow.appendChild(qField);

    if (!isForeignSectorActive) {
      var scopeField = el('div', 'jp-field');
      var scopeSel = el('select', 'jp-select');
      scopeSel.id = 'jp-sel-scope';
      scopeSel.setAttribute('aria-label', 'Geographic Scope');
      [['', state.lang === 'or' ? 'ସମସ୍ତ ସ୍କୋପ୍' : 'All Scopes']].concat(
        REGION_PRESETS.filter(function (p) { return p[0] !== 'foreign'; })
      ).forEach(function (optPair) {
        var op = el('option', '', optPair[1]);
        op.value = optPair[0];
        if (state.filters.region === optPair[0]) op.selected = true;
        scopeSel.appendChild(op);
      });
      scopeSel.addEventListener('change', function () {
        state.filters.region = scopeSel.value;
        loadPortalJobs(mount);
      });
      scopeField.appendChild(scopeSel);
      filterRow.appendChild(scopeField);
    }

    var stageField = el('div', 'jp-field');
    var stageSel = el('select', 'jp-select');
    stageSel.id = 'jp-sel-stage';
    stageSel.setAttribute('aria-label', 'Recruitment Stage');
    [['', state.lang === 'or' ? 'ସମସ୍ତ ପର୍ଯ୍ୟାୟ' : 'All Stages']].concat(STAGE_PRESETS).forEach(function (optPair) {
      var op = el('option', '', optPair[1]);
      op.value = optPair[0];
      if (state.filters.stage === optPair[0]) op.selected = true;
      stageSel.appendChild(op);
    });
    stageSel.addEventListener('change', function () {
      state.filters.stage = stageSel.value;
      loadPortalJobs(mount);
    });
    stageField.appendChild(stageSel);
    filterRow.appendChild(stageField);

    if (hasFilter) {
      var rst = el('button', 'jp-btn jp-btn--xs jp-reset-btn', state.lang === 'or' ? '✕ ରିସେଟ୍' : '✕ Reset');
      rst.type = 'button';
      rst.addEventListener('click', function () {
        state.filters = { l1: '', l2: '', l3: '', region: '', district: '', qualification: '', stage: '', search: '' };
        loadPortalJobs(mount);
      });
      filterRow.appendChild(rst);
    }
    filterSec.appendChild(filterRow);

    // Active Filter Chips (shows deep-linked sector, dept/sub-category, tenure, region, stage, search)
    var activeChips = [];
    if (state.filters.l1) {
      var n1 = state.nodes.find(function (n) { return n.id === state.filters.l1 || n.slug === state.filters.l1; });
      activeChips.push(['Sector: ' + (n1 ? pick(n1, 'title') : state.filters.l1), function () { state.filters.l1 = ''; state.filters.l2 = ''; state.filters.l3 = ''; loadPortalJobs(mount); }]);
    }
    if (state.filters.l2) {
      var n2 = state.nodes.find(function (n) { return n.id === state.filters.l2 || n.slug === state.filters.l2; });
      activeChips.push(['Department: ' + (n2 ? pick(n2, 'title') : state.filters.l2), function () { state.filters.l2 = ''; state.filters.l3 = ''; loadPortalJobs(mount); }]);
    }
    if (state.filters.l3) {
      var n3 = state.nodes.find(function (n) { return n.id === state.filters.l3 || n.slug === state.filters.l3; });
      activeChips.push(['Tenure: ' + (n3 ? pick(n3, 'title') : state.filters.l3), function () { state.filters.l3 = ''; loadPortalJobs(mount); }]);
    }
    if (state.filters.region) {
      var rp = REGION_PRESETS.find(function (p) { return p[0] === state.filters.region; });
      activeChips.push(['Scope: ' + (rp ? rp[1] : state.filters.region), function () { state.filters.region = ''; loadPortalJobs(mount); }]);
    }
    if (state.filters.stage) {
      var sp = STAGE_PRESETS.find(function (p) { return p[0] === state.filters.stage; });
      activeChips.push(['Stage: ' + (sp ? sp[1] : state.filters.stage), function () { state.filters.stage = ''; loadPortalJobs(mount); }]);
    }
    if (state.filters.district) {
      activeChips.push(['District: ' + state.filters.district, function () { state.filters.district = ''; loadPortalJobs(mount); }]);
    }
    if (state.filters.qualification) {
      activeChips.push(['Qualification: ' + state.filters.qualification, function () { state.filters.qualification = ''; loadPortalJobs(mount); }]);
    }
    if (state.filters.search) {
      activeChips.push(['Search: "' + state.filters.search + '"', function () { state.filters.search = ''; loadPortalJobs(mount); }]);
    }
    if (activeChips.length) {
      var chipBar = el('div', 'jp-active-chips');
      chipBar.setAttribute('aria-label', 'Active Filters');
      activeChips.forEach(function (pair) {
        var ch = el('button', 'jp-filter-pill is-active', pair[0] + ' ✕');
        ch.type = 'button';
        ch.addEventListener('click', pair[1]);
        chipBar.appendChild(ch);
      });
      filterSec.appendChild(chipBar);
    }
    wrap.appendChild(filterSec);

    // 3. Clean Job Cards OR Single Compact Empty State Card
    if (!state.items.length) {
      var emptyCard = el('section', 'jp-empty-card jp-empty-card--compact');
      emptyCard.setAttribute('aria-label', 'Recruitment Notifications Status');
      emptyCard.appendChild(el('h2', 'jp-empty-title', state.lang === 'or'
        ? 'ଏହି ମୁହୂର୍ତ୍ତରେ କୌଣସି ମେଳ ଖାଉଥିବା ନିଯୁକ୍ତି ବିଜ୍ଞପ୍ତି ନାହିଁ'
        : 'No matching job notifications right now'));
      emptyCard.appendChild(el('p', 'jp-empty-desc', hasFilter
        ? (state.lang === 'or'
          ? 'ଅନ୍ୟ କ୍ଷେତ୍ର କିମ୍ବା ଫିଲ୍ଟର୍ ଚେଷ୍ଟା କରନ୍ତୁ କିମ୍ବା ଫିଲ୍ଟର୍ ରିସେଟ୍ କରନ୍ତୁ।'
          : 'Try broadening your sector, scope, or stage selection — or reset filters to view all available openings.')
        : (state.lang === 'or'
          ? 'ନୂତନ ଯାଞ୍ଚିତ ନିଯୁକ୍ତି ବିଜ୍ଞପ୍ତି ପ୍ରକାଶିତ ହେବା ମାତ୍ରେ ଏଠାରେ ଦେଖାଯିବ।'
          : 'New verified Odisha & Central recruitment notifications will appear here as soon as they are published.')));

      var emptyActions = el('div', 'jp-pills-row');
      if (hasFilter) {
        var resetBtn = el('button', 'jp-btn jp-btn--primary', state.lang === 'or' ? 'ଫିଲ୍ଟର୍ ରିସେଟ୍ କରନ୍ତୁ' : 'Reset Filters');
        resetBtn.type = 'button';
        resetBtn.addEventListener('click', function () {
          state.filters = { l1: '', l2: '', l3: '', region: '', district: '', qualification: '', stage: '', search: '' };
          loadPortalJobs(mount);
        });
        emptyActions.appendChild(resetBtn);
      }
      if (state.isAdmin) {
        var adminBtn = el('a', 'jp-btn jp-btn--primary', '+ Publish Job in Admin Studio ↗');
        adminBtn.href = '/admin/#folder-jobs-careers';
        emptyActions.appendChild(adminBtn);
      }
      if (emptyActions.children.length) {
        emptyCard.appendChild(emptyActions);
      }
      wrap.appendChild(emptyCard);
    } else {
      var resBar = el('div', 'jp-results-bar');
      resBar.appendChild(el('h2', 'jp-h2', state.lang === 'or'
        ? (num(state.items.length) + ' ଟି ଯାଞ୍ଚିତ ନିଯୁକ୍ତି ବିଜ୍ଞପ୍ତି')
        : (num(state.items.length) + ' Verified Recruitment Notification' + (state.items.length === 1 ? '' : 's'))));
      if (state.isAdmin) {
        var pubMore = el('a', 'jp-btn jp-btn--xs', '+ Publish New Job in Admin Studio ↗');
        pubMore.href = '/admin/#folder-jobs-careers';
        resBar.appendChild(pubMore);
      }
      wrap.appendChild(resBar);

      var grid = el('div', 'jp-jobs-grid');
      state.items.forEach(function (job) { grid.appendChild(buildJobCard(job)); });
      wrap.appendChild(grid);
    }

    clear(mount);
    mount.appendChild(wrap);
  }

  function normalizeStageUrlParam(raw) {
    var s = String(raw || '').trim().toLowerCase();
    if (s === 'apply-online' || s === 'apply_online') return 'notification';
    if (s === 'admit-card' || s === 'admit_card') return 'admit_card';
    if (s === 'answer-key' || s === 'answer_key') return 'answer_key';
    if (s === 'closing-soon' || s === 'closing_soon') return 'closing-soon';
    return s;
  }

  function resolveNodeIdBySlugOrId(nodes, level, rawVal) {
    var v = String(rawVal || '').trim().toLowerCase();
    if (!v) return '';
    var hit = (nodes || []).find(function (n) {
      return Number(n.level) === level && (String(n.id || '').toLowerCase() === v || String(n.slug || '').toLowerCase() === v);
    });
    return hit ? hit.id : rawVal;
  }

  function syncJobsUrlParams() {
    if (!window.history || !window.history.replaceState) return;
    var qs = new URLSearchParams();
    if (state.filters.l1) {
      var n1 = state.nodes.find(function (n) { return n.id === state.filters.l1; });
      qs.set('sector', n1 ? n1.slug : state.filters.l1);
    }
    if (state.filters.l2) {
      var n2 = state.nodes.find(function (n) { return n.id === state.filters.l2; });
      qs.set('sub', n2 ? n2.slug : state.filters.l2);
    }
    if (state.filters.l3) {
      var n3 = state.nodes.find(function (n) { return n.id === state.filters.l3; });
      qs.set('tenure', n3 ? n3.slug : state.filters.l3);
    }
    if (state.filters.region) qs.set('region', state.filters.region);
    if (state.filters.stage) qs.set('stage', state.filters.stage);
    if (state.filters.district) qs.set('district', state.filters.district);
    if (state.filters.qualification) qs.set('qualification', state.filters.qualification);
    if (state.filters.search) qs.set('q', state.filters.search);
    var target = window.location.pathname + (qs.toString() ? '?' + qs.toString() : '');
    try { window.history.replaceState(null, '', target); } catch (_) {}
  }

  function loadPortalJobs(mount, skipUrlSync) {
    if (!skipUrlSync) syncJobsUrlParams();
    var qs = new URLSearchParams();
    if (state.filters.l1) qs.set('l1', state.filters.l1);
    if (state.filters.l2) qs.set('l2', state.filters.l2);
    if (state.filters.l3) qs.set('l3', state.filters.l3);
    if (state.filters.region) qs.set('region', state.filters.region);
    if (state.filters.district) qs.set('district', state.filters.district);
    if (state.filters.qualification) qs.set('qualification', state.filters.qualification);
    if (state.filters.stage) qs.set('stage', state.filters.stage);
    if (state.filters.search) qs.set('search', state.filters.search);
    fetch('/api/public/jobs/list?' + qs.toString(), { cache: 'no-store', credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (d && d.ok) {
          state.items = d.items || [];
          if (!qs.toString()) state.allItems = state.items.slice();
          if (d.facets) state.facets = d.facets;
        }
        renderPortalListing(mount);
      })
      .catch(function () {
        renderPortalListing(mount);
      });
  }

  function loadCandidateProfile() {
    return fetch('/api/candidate/profile', { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (d && d.ok && d.profile) state.candidate = d.profile;
      })
      .catch(function () { state.candidate = null; });
  }

  function detectAdminSession() {
    var hint = false;
    try { hint = localStorage.getItem('cso_admin_active') === '1'; } catch (_) {}
    if (!hint) return Promise.resolve(false);
    return fetch('/api/admin/session', { credentials: 'same-origin', cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        state.isAdmin = Boolean(d && d.user);
        return state.isAdmin;
      })
      .catch(function () { state.isAdmin = false; return false; });
  }

  function init() {
    var mount = document.getElementById(MOUNT_ID);
    if (!mount) return;
    activatePortalShell();
    state.lang = getLangPref();

    var params = new URLSearchParams(window.location.search || '');
    var slug = (params.get('slug') || '').trim();
    if (!slug) {
      var pathRest = (window.location.pathname || '').replace(/^\/jobs\//, '').replace(/\/+$/, '');
      if (pathRest && pathRest.indexOf('/') === -1 && pathRest !== 'index.html') {
        try { slug = decodeURIComponent(pathRest); } catch (_) { slug = pathRest; }
      }
    }
    var previewToken = (params.get('preview_token') || '').trim();

    if (slug) {
      var artUrl = '/api/public/jobs/article?slug=' + encodeURIComponent(slug) + (previewToken ? '&preview_token=' + encodeURIComponent(previewToken) : '');
      clear(mount).appendChild(el('div', 'jp-card', 'Loading job notification…'));
      Promise.all([
        fetch(artUrl, { cache: 'no-store', credentials: 'same-origin' }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); }),
        loadCandidateProfile()
      ]).then(function (pair) {
        var res = pair[0];
        if (!res.ok || !res.data || !res.data.article) {
          clear(mount).appendChild(el('div', 'jp-card', 'Job notification not found or preview link has expired.'));
          return;
        }
        state.articlePayload = res.data;
        renderArticleView(mount, res.data);
        if (!res.data.is_preview) sendTelemetry('view', res.data.article);
      }).catch(function () {
        clear(mount).appendChild(el('div', 'jp-card', 'Unable to load job notification right now. Please try again.'));
      });
      return;
    }

    // Instant optimistic skeleton shell (<16ms mount) — preserve pre-rendered HTML hero+skeleton if present (CLS = 0)
    if (!mount.querySelector('.cso-portal-skeleton')) {
      clear(mount);
      var skel = el('div', 'cso-portal-skeleton');
      skel.setAttribute('aria-busy', 'true');
      skel.appendChild(el('div', 'cso-skel-hero'));
      skel.appendChild(el('div', 'cso-skel-bar'));
      var skelGrid = el('div', 'cso-skel-grid');
      skelGrid.appendChild(el('div', 'cso-skel-card'));
      skelGrid.appendChild(el('div', 'cso-skel-card'));
      skel.appendChild(skelGrid);
      mount.appendChild(skel);
    }

    // Listing mode: single-roundtrip batched bootstrap endpoint + deep-link URL filter hydration
    var rawSector = (params.get('sector') || params.get('l1') || '').trim();
    var rawSub = (params.get('dept') || params.get('sub') || params.get('l2') || '').trim();
    var rawTenure = (params.get('tenure') || params.get('l3') || '').trim();
    var rawRegion = (params.get('region') || '').trim().toLowerCase();
    var rawStage = normalizeStageUrlParam(params.get('stage') || '');
    var rawDistrict = (params.get('district') || '').trim();
    var rawQual = (params.get('qualification') || '').trim();
    var rawSearch = (params.get('q') || params.get('search') || '').trim();
    var hasDeepLink = Boolean(rawSector || rawSub || rawTenure || rawRegion || rawStage || rawDistrict || rawQual || rawSearch);

    Promise.all([
      fetch('/api/public/jobs/bootstrap', { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
      detectAdminSession()
    ]).then(function (pair) {
      var boot = pair[0];
      if (boot && boot.ok) {
        state.tree = boot.tree || [];
        state.nodes = boot.nodes || [];
        state.items = boot.items || boot.articles || [];
        state.allItems = state.items.slice();
        if (boot.facets) state.facets = boot.facets;
      }
      if (hasDeepLink) {
        state.filters.l1 = resolveNodeIdBySlugOrId(state.nodes, 1, rawSector);
        state.filters.l2 = resolveNodeIdBySlugOrId(state.nodes, 2, rawSub);
        state.filters.l3 = resolveNodeIdBySlugOrId(state.nodes, 3, rawTenure);
        var resolvedL1 = findNodeById(state.nodes, state.filters.l1);
        var isForeignDeepLink = Boolean(
          (resolvedL1 && String(resolvedL1.slug || '').toLowerCase() === 'foreign') ||
          rawSector.toLowerCase() === 'foreign'
        );
        state.filters.region = (isForeignDeepLink && ['odisha', 'central', 'all-india'].indexOf(rawRegion) !== -1)
          ? ''
          : rawRegion;
        state.filters.stage = rawStage;
        state.filters.district = rawDistrict;
        state.filters.qualification = rawQual;
        state.filters.search = rawSearch;
        loadPortalJobs(mount, true);
        return;
      }
      renderPortalListing(mount);
    }).catch(function () {
      try { renderPortalListing(mount); } catch (_) {}
    });
  }

  window.CSOJobsPortal = { init: init, renderProse: renderProse, downloadJobIcs: downloadJobIcs };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window, document);
