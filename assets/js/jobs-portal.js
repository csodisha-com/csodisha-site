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
    ['admit_card', 'Admit Card'],
    ['answer_key', 'Answer Key'],
    ['result', 'Result']
  ];
  var ODISHA_DISTRICTS = [
    'All Odisha', 'Angul', 'Balangir', 'Balasore', 'Bargarh', 'Bhadrak', 'Boudh',
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
    filters: { l1: '', l2: '', l3: '', district: '', qualification: '', stage: '', search: '' },
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
          var img = el('img', 'jp-inline-img');
          img.src = src;
          img.alt = imgMatch[1] || '';
          img.loading = 'lazy';
          container.appendChild(img);
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
  function buildStructuredTable(title, rows, cols) {
    if (!Array.isArray(rows) || !rows.length) return null;
    var sec = el('section', 'jp-card');
    sec.appendChild(el('h2', 'jp-h2', title));
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
        tr.appendChild(el('td', '', val || '—'));
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrap.appendChild(table);
    sec.appendChild(wrap);
    return sec;
  }

  // ---------- .ics Calendar Download Fallback ----------
  function downloadJobIcs(article) {
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

    if (a.last_date || a.exam_date) {
      var icsBtn = el('button', 'jp-btn', '📅 Download .ics Calendar Reminder');
      icsBtn.type = 'button';
      icsBtn.addEventListener('click', function () { downloadJobIcs(a); });
      actRow.appendChild(icsBtn);
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

    // 9. Structured Tables (Vacancies, Important Dates, Fee Structure, Selection Steps, Cutoff Reference)
    var tables = [
      buildStructuredTable('Post-wise Vacancy & Qualification Breakdown', a.vacancy_breakdown, [['post_name', 'Post / Cadre'], ['vacancies', 'Vacancies'], ['qualification', 'Qualification'], ['pay_level', 'Pay Scale']]),
      buildStructuredTable('Important Dates Timeline', a.important_dates, [['event', 'Milestone'], ['date', 'Date'], ['note', 'Remarks']]),
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

    // 12. Related Active Jobs (up to 3)
    var related = payload.related_jobs || [];
    if (related.length) {
      var relSec = el('section', 'jp-card');
      relSec.appendChild(el('h2', 'jp-h2', 'Related Active Opportunities'));
      var relGrid = el('div', 'jp-jobs-grid');
      related.forEach(function (r) { relGrid.appendChild(buildJobCard(r)); });
      relSec.appendChild(relGrid);
      wrap.appendChild(relSec);
    }

    mount.appendChild(wrap);
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
    clear(mount);
    var hasFilter = Boolean(state.filters.l1 || state.filters.l2 || state.filters.l3 || state.filters.district || state.filters.qualification || state.filters.stage || state.filters.search);
    var kpis = computeHeroKpis();

    var wrap = el('div', 'jp-portal');

    // 1. Flagship Editorial Hero Banner
    var hero = el('section', 'jp-hero');
    hero.setAttribute('aria-label', 'Odisha & Central Government Jobs & Careers');
    var heroTop = el('div', 'jp-hero-top');
    var eyebrow = el('span', 'jp-eyebrow');
    eyebrow.appendChild(el('span', 'jp-eyebrow-dot'));
    eyebrow.appendChild(el('span', '', state.lang === 'or'
      ? 'ଓଡ଼ିଶା ଏବଂ କେନ୍ଦ୍ର ନିଯୁକ୍ତି ପୋର୍ଟାଲ୍ · ଯାଞ୍ଚିତ .GOV.IN ବିଜ୍ଞପ୍ତି'
      : 'ODISHA & CENTRAL RECRUITMENT PORTAL · VERIFIED .GOV.IN NOTIFICATIONS'));
    heroTop.appendChild(eyebrow);
    heroTop.appendChild(buildLangToggle(function () { renderPortalListing(mount); }));
    hero.appendChild(heroTop);

    var copy = el('div', 'jp-hero-copy');
    copy.appendChild(el('h1', 'jp-hero-title', state.lang === 'or'
      ? 'ଓଡ଼ିଶା ଏବଂ କେନ୍ଦ୍ର ସରକାରୀ ନିଯୁକ୍ତି ଓ କ୍ୟାରିଅର୍'
      : 'Odisha & Central Government Jobs & Careers'));
    copy.appendChild(el('p', 'jp-hero-sub', state.lang === 'or'
      ? 'OPSC, OSSC, OSSSC, UPSC, SSC, ବ୍ୟାଙ୍କିଙ୍ଗ୍ ଏବଂ ଓଡ଼ିଶାର ସମସ୍ତ ୩୦ ଜିଲ୍ଲାର ଯାଞ୍ଚିତ ନିଯୁକ୍ତି ବିଜ୍ଞପ୍ତି, ପଦବୀ ବିବରଣୀ, ସିଲାବସ୍ PDF, ଆଡମିଟ୍ କାର୍ଡ ଏବଂ ପରୀକ୍ଷା ତାରିଖ।'
      : 'Verified recruitment notifications, vacancy breakdowns, syllabus PDFs, admit cards, and exam dates across OPSC, OSSC, OSSSC, UPSC, SSC, Banking & Odisha Districts.'));
    hero.appendChild(copy);

    var kpiRow = el('div', 'jp-hero-kpis');
    [
      [num(kpis.activeCount), state.lang === 'or' ? 'ସକ୍ରିୟ ନିଯୁକ୍ତି' : 'Active Recruitments'],
      [num(kpis.totalVacancies), state.lang === 'or' ? 'ମୋଟ ପଦବୀ' : 'Total Vacancies'],
      [num(kpis.closingSoon), state.lang === 'or' ? 'ଏହି ସପ୍ତାହରେ ଶେଷ' : 'Closing This Week'],
      [num(kpis.deptCount), state.lang === 'or' ? 'ବିଭାଗ / ବୋର୍ଡ' : 'Departments / Boards']
    ].forEach(function (pair) {
      var tile = el('div', 'jp-hero-kpi');
      tile.appendChild(el('strong', 'jp-hero-kpi-val', pair[0]));
      tile.appendChild(el('span', 'jp-hero-kpi-label', pair[1]));
      kpiRow.appendChild(tile);
    });
    hero.appendChild(kpiRow);
    wrap.appendChild(hero);

    // 2. Visual Sector Cards + 4-Column Cascading Filter Bar + Quick-Filter Row
    var filterSec = el('section', 'jp-card');
    filterSec.setAttribute('aria-label', 'Jobs 3-Layer Filter Explorer');

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
          loadPortalJobs(mount);
        });
        sectorStrip.appendChild(b);
      });
      filterSec.appendChild(sectorStrip);
    }

    // 4-Column Filter Grid
    var cGrid = el('div', 'jp-cascade-grid');
    function makeSel(label, opts, val, onChange) {
      var f = el('div', 'jp-field');
      var selId = 'jp-sel-' + label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      var lbl = el('label', 'jp-label', label);
      lbl.setAttribute('for', selId);
      f.appendChild(lbl);
      var s = el('select', 'jp-select');
      s.id = selId;
      opts.forEach(function (o) {
        var op = el('option', '', o[1]); op.value = o[0];
        if (o[0] === val) op.selected = true;
        s.appendChild(op);
      });
      s.addEventListener('change', function () { onChange(s.value); });
      f.appendChild(s);
      return f;
    }

    var l2Nodes = state.nodes.filter(function (n) { return Number(n.level) === 2 && (!state.filters.l1 || n.parent_id === state.filters.l1); });
    var l3Nodes = state.nodes.filter(function (n) { return Number(n.level) === 3 && (!state.filters.l2 || n.parent_id === state.filters.l2); });

    cGrid.appendChild(makeSel(
      '1. Sector / Main Category',
      [['', 'All Sectors']].concat(l1Nodes.map(function (n) { return [n.id, pick(n, 'title') + ' (' + (n.published_jobs_count || 0) + ')']; })),
      state.filters.l1,
      function (v) { state.filters.l1 = v; state.filters.l2 = ''; state.filters.l3 = ''; loadPortalJobs(mount); }
    ));
    cGrid.appendChild(makeSel(
      '2. Department / Commission',
      [['', 'All Departments & Boards']].concat(l2Nodes.map(function (n) { return [n.id, pick(n, 'title') + ' (' + (n.published_jobs_count || 0) + ')']; })),
      state.filters.l2,
      function (v) { state.filters.l2 = v; state.filters.l3 = ''; loadPortalJobs(mount); }
    ));
    cGrid.appendChild(makeSel(
      '3. Tenure / Cadre Type',
      [['', 'All Tenure & Cadre Types']].concat(l3Nodes.map(function (n) { return [n.id, pick(n, 'title') + ' (' + (n.published_jobs_count || 0) + ')']; })),
      state.filters.l3,
      function (v) { state.filters.l3 = v; loadPortalJobs(mount); }
    ));

    var qField = el('div', 'jp-field');
    var qLbl = el('label', 'jp-label', '4. Search by Post, Advt. No. or District');
    qLbl.setAttribute('for', 'jp-portal-search');
    qField.appendChild(qLbl);
    var qInp = el('input', 'jp-input');
    qInp.id = 'jp-portal-search';
    qInp.type = 'search';
    qInp.placeholder = state.lang === 'or' ? 'ପଦବୀ, ବିଜ୍ଞାପନ ନମ୍ବର କିମ୍ବା ଜିଲ୍ଲା ଖୋଜନ୍ତୁ...' : 'Search by Post, Advt. No. or District...';
    qInp.value = state.filters.search;
    var timer = null;
    qInp.addEventListener('input', function () {
      state.filters.search = qInp.value.trim();
      clearTimeout(timer);
      timer = setTimeout(function () { loadPortalJobs(mount); }, 180);
    });
    qField.appendChild(qInp);
    cGrid.appendChild(qField);
    filterSec.appendChild(cGrid);

    // Quick-Filter Pill Row: Qualification, Lifecycle Stage & All 30 Odisha Districts
    var quickBar = el('div', 'jp-quickbar');

    var qualGroup = el('div', 'jp-quick-group');
    qualGroup.appendChild(el('span', 'jp-quick-group-label', 'Qualification:'));
    var qualOptions = QUAL_PRESETS.slice();
    (state.facets.qualifications || []).forEach(function (fq) {
      if (fq && qualOptions.indexOf(fq) === -1) qualOptions.push(fq);
    });
    qualOptions.slice(0, 6).forEach(function (q) {
      var b = el('button', 'jp-filter-pill' + (state.filters.qualification === q ? ' is-active' : ''), '🎓 ' + q);
      b.type = 'button';
      b.addEventListener('click', function () {
        state.filters.qualification = state.filters.qualification === q ? '' : q;
        loadPortalJobs(mount);
      });
      qualGroup.appendChild(b);
    });
    quickBar.appendChild(qualGroup);

    var stageGroup = el('div', 'jp-quick-group');
    stageGroup.appendChild(el('span', 'jp-quick-group-label', 'Stage:'));
    STAGE_PRESETS.forEach(function (pair) {
      var b = el('button', 'jp-filter-pill' + (state.filters.stage === pair[0] ? ' is-active' : ''), pair[1]);
      b.type = 'button';
      b.addEventListener('click', function () {
        state.filters.stage = state.filters.stage === pair[0] ? '' : pair[0];
        loadPortalJobs(mount);
      });
      stageGroup.appendChild(b);
    });
    quickBar.appendChild(stageGroup);

    var distGroup = el('div', 'jp-quick-group');
    distGroup.appendChild(el('span', 'jp-quick-group-label', 'Odisha District:'));
    var distSel = el('select', 'jp-select jp-district-select');
    distSel.setAttribute('aria-label', 'Filter by Odisha District');
    var optAllD = el('option', '', 'All 30 Districts');
    optAllD.value = '';
    distSel.appendChild(optAllD);
    ODISHA_DISTRICTS.forEach(function (d) {
      var op = el('option', '', d);
      op.value = d;
      if (state.filters.district === d) op.selected = true;
      distSel.appendChild(op);
    });
    distSel.addEventListener('change', function () {
      state.filters.district = distSel.value;
      loadPortalJobs(mount);
    });
    distGroup.appendChild(distSel);
    quickBar.appendChild(distGroup);

    if (hasFilter) {
      var rst = el('button', 'jp-btn jp-btn--xs', '✕ Reset Filters');
      rst.type = 'button';
      rst.addEventListener('click', function () {
        state.filters = { l1: '', l2: '', l3: '', district: '', qualification: '', stage: '', search: '' };
        loadPortalJobs(mount);
      });
      quickBar.appendChild(rst);
    }
    filterSec.appendChild(quickBar);
    wrap.appendChild(filterSec);

    // 3. Recruitment Cards OR Single Illustrated Empty State + Seeded 3-Layer Departments Directory
    if (!state.items.length) {
      var emptyCard = el('section', 'jp-empty-card');
      emptyCard.setAttribute('aria-label', 'Recruitment Notifications Status');
      var art = el('div', 'jp-empty-art');
      art.appendChild(buildEmptyBriefcaseSvg());
      emptyCard.appendChild(art);

      emptyCard.appendChild(el('h2', 'jp-empty-title', hasFilter
        ? (state.lang === 'or' ? 'ଆପଣଙ୍କ ଫିଲ୍ଟର୍ ସହିତ କୌଣସି ନିଯୁକ୍ତି ମିଳିଲା ନାହିଁ' : 'No Recruitment Notifications Match Your Selected Filters')
        : (state.lang === 'or' ? 'ନୂତନ ସରକାରୀ ନିଯୁକ୍ତି ବିଜ୍ଞପ୍ତି ଶୀଘ୍ର ପ୍ରକାଶିତ ହେବ' : 'Fresh Verified Recruitment Notifications Coming Soon')));

      emptyCard.appendChild(el('p', 'jp-empty-desc', hasFilter
        ? (state.lang === 'or'
          ? 'ଅନ୍ୟ କ୍ଷେତ୍ର, ବିଭାଗ କିମ୍ବା ଯୋଗ୍ୟତା ଚେଷ୍ଟା କରନ୍ତୁ କିମ୍ବା ସମସ୍ତ ଫିଲ୍ଟର୍ ରିସେଟ୍ କରନ୍ତୁ।'
          : 'Try widening your sector, department, qualification, or district filters — or browse our 3-layer Odisha & Central recruitment boards below.')
        : (state.lang === 'or'
          ? 'ଏହି ପୋର୍ଟାଲ୍ ସିଧାସଳଖ ଯାଞ୍ଚିତ .gov.in ସୂଚନା ସହିତ ଅପଡେଟ୍ ହୁଏ। ତଳେ ଥିବା ବିଭାଗ ଏବଂ ବୋର୍ଡଗୁଡ଼ିକୁ ବ୍ରାଉଜ୍ କରନ୍ତୁ।'
          : 'Every notice published here is verified against official .gov.in / .nic.in gazettes with vacancy tables, syllabus PDFs, and exam dates. Explore the recruiting boards below.')));

      var emptyActions = el('div', 'jp-pills-row');
      if (hasFilter) {
        var resetBtn = el('button', 'jp-btn jp-btn--primary', state.lang === 'or' ? 'ସମସ୍ତ ଫିଲ୍ଟର୍ ରିସେଟ୍ କରନ୍ତୁ' : 'Reset All Filters');
        resetBtn.type = 'button';
        resetBtn.addEventListener('click', function () {
          state.filters = { l1: '', l2: '', l3: '', district: '', qualification: '', stage: '', search: '' };
          loadPortalJobs(mount);
        });
        emptyActions.appendChild(resetBtn);
      }
      var studyLink = el('a', 'jp-btn', state.lang === 'or' ? '📚 ଷ୍ଟଡି ଲାଇବ୍ରେରୀ ଦେଖନ୍ତୁ →' : '📚 Explore Study Library →');
      studyLink.href = '/study-library/';
      emptyActions.appendChild(studyLink);

      if (state.isAdmin) {
        var adminBtn = el('a', 'jp-btn jp-btn--primary', '+ Publish First Job in Admin Studio ↗');
        adminBtn.href = '/admin/#folder-jobs-careers';
        emptyActions.appendChild(adminBtn);
      }
      emptyCard.appendChild(emptyActions);
      wrap.appendChild(emptyCard);

      // Show Browse 3-Layer Departments Grid so the portal never feels bare
      renderDepartmentsDirectory(wrap, mount);
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

    mount.appendChild(wrap);
  }

  function loadPortalJobs(mount) {
    var qs = new URLSearchParams();
    if (state.filters.l1) qs.set('l1', state.filters.l1);
    if (state.filters.l2) qs.set('l2', state.filters.l2);
    if (state.filters.l3) qs.set('l3', state.filters.l3);
    if (state.filters.district) qs.set('district', state.filters.district);
    if (state.filters.qualification) qs.set('qualification', state.filters.qualification);
    if (state.filters.stage) qs.set('stage', state.filters.stage);
    if (state.filters.search) qs.set('search', state.filters.search);
    fetch('/api/public/jobs?' + qs.toString(), { cache: 'no-store', credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (d && d.ok) {
          state.items = d.items || [];
          if (!qs.toString()) state.allItems = state.items.slice();
          if (d.facets) state.facets = d.facets;
          renderPortalListing(mount);
        }
      })
      .catch(function () {});
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

    // Listing mode: single-roundtrip batched bootstrap endpoint + parallel admin overlay
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
      renderPortalListing(mount);
    });
  }

  window.CSOJobsPortal = { init: init, renderProse: renderProse, downloadJobIcs: downloadJobIcs };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window, document);
