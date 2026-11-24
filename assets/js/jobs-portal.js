/**
 * Common Sense Odisha — Public Jobs & Careers Portal, 3-Layer Taxonomy & Visual Article Engine (v249)
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

  var state = {
    lang: 'en',
    tree: [],
    nodes: [],
    items: [],
    facets: { districts: [], qualifications: [], stages: [] },
    filters: { l1: '', l2: '', l3: '', district: '', qualification: '', stage: '', search: '' },
    candidate: null,
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
    [['en', 'English'], ['or', 'ଓଡ଼ିଆ']].forEach(function (pair) {
      var b = el('button', 'jp-lang-btn' + (state.lang === pair[0] ? ' is-active' : ''), pair[1]);
      b.type = 'button';
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
    clear(mount);
    var a = payload.article;
    var wrap = el('div', 'jp-article');
    document.title = (pick(a, 'title') || a.title_en) + ' | CS Odisha Jobs';

    // Hide legacy explorer sections while reading a rich job article
    ['jobs-categories-panel', 'jobs-filters-panel', 'jobs-items-grid', 'explorer'].forEach(function (id) {
      var n = document.getElementById(id);
      if (n) n.hidden = true;
    });

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
  // JOB CARD BUILDER & PORTAL LISTING MODE
  // ======================================================================
  function buildJobCard(job) {
    var card = el('article', 'jp-job-card');
    if (job.cover_image_url && safeHref(job.cover_image_url)) {
      var thumb = el('img', 'jp-job-thumb');
      thumb.src = safeHref(job.cover_image_url);
      thumb.alt = job.title_en;
      thumb.loading = 'lazy';
      card.appendChild(thumb);
    }
    var body = el('div', 'jp-job-card-body');
    var meta = el('div', 'jp-pills-row');
    meta.appendChild(el('span', 'jp-badge ' + (job.is_expired ? 'jp-badge--closed' : (job.days_remaining !== null && job.days_remaining <= 7 ? 'jp-badge--urgent' : 'jp-badge--active')), job.status_badge || 'Active'));
    if (job.taxonomy && job.taxonomy.l2) meta.appendChild(el('span', 'jp-badge', pick(job.taxonomy.l2, 'title')));
    if (job.taxonomy && job.taxonomy.l3) meta.appendChild(el('span', 'jp-badge', pick(job.taxonomy.l3, 'title')));
    body.appendChild(meta);

    var h3 = el('h3', 'jp-job-title');
    var a = el('a', '', pick(job, 'title') || job.title_en);
    a.href = '/jobs/?slug=' + encodeURIComponent(job.slug);
    h3.appendChild(a);
    body.appendChild(h3);

    var orgLine = [pick(job, 'organisation'), job.total_vacancies ? (num(job.total_vacancies) + ' Posts') : '', job.qualification_level || ''].filter(Boolean).join(' · ');
    if (orgLine) body.appendChild(el('div', 'jp-muted', orgLine));
    if (pick(job, 'summary')) body.appendChild(el('div', 'jp-muted', pick(job, 'summary').slice(0, 140)));

    var acts = el('div', 'jp-pills-row');
    var readA = el('a', 'jp-btn jp-btn--xs jp-btn--primary', 'View Full Details →');
    readA.href = '/jobs/?slug=' + encodeURIComponent(job.slug);
    acts.appendChild(readA);
    if (job.official_apply_url && safeHref(job.official_apply_url) && !job.is_expired) {
      var appA = el('a', 'jp-btn jp-btn--xs', 'Apply ↗');
      appA.href = safeHref(job.official_apply_url);
      appA.target = '_blank';
      appA.rel = 'noopener noreferrer';
      acts.appendChild(appA);
    }
    body.appendChild(acts);
    card.appendChild(body);
    return card;
  }

  function renderPortalListing(mount) {
    clear(mount);
    var hasTaxonomy = state.nodes.length > 0;
    var hasJobs = state.items.length > 0;
    var hasFilter = Boolean(state.filters.l1 || state.filters.l2 || state.filters.l3 || state.filters.district || state.filters.qualification || state.filters.stage || state.filters.search);

    if (!hasTaxonomy && !hasJobs && !hasFilter) {
      return; // Respect clean-slate empty explorer when nothing is published yet
    }

    var wrap = el('div', 'jp-portal');

    // 3-Layer Cascading Category Selector & Filters Panel
    var filterSec = el('section', 'jp-card');
    var head = el('div', 'jp-card-head');
    var hl = el('div');
    hl.appendChild(el('h2', 'jp-h2', state.lang === 'or' ? '୩-ସ୍ତରୀୟ ଚାକିରି ବର୍ଗ ଓ ବିଜ୍ଞପ୍ତି' : 'Jobs & Careers — 3-Layer Category Explorer'));
    hl.appendChild(el('div', 'jp-muted', state.items.length + ' verified recruitment article(s) live from D1'));
    head.appendChild(hl);
    head.appendChild(buildLangToggle(function () { renderPortalListing(mount); }));
    filterSec.appendChild(head);

    // Level 1 Quick Category Pills
    var l1Nodes = state.nodes.filter(function (n) { return Number(n.level) === 1; });
    if (l1Nodes.length) {
      var l1Pills = el('div', 'jp-pills-row');
      var allBtn = el('button', 'jp-filter-pill' + (!state.filters.l1 ? ' is-active' : ''), 'All Sectors');
      allBtn.type = 'button';
      allBtn.addEventListener('click', function () {
        state.filters.l1 = ''; state.filters.l2 = ''; state.filters.l3 = '';
        loadPortalJobs(mount);
      });
      l1Pills.appendChild(allBtn);
      l1Nodes.forEach(function (n) {
        var b = el('button', 'jp-filter-pill' + (state.filters.l1 === n.id ? ' is-active' : ''));
        b.type = 'button';
        b.appendChild(el('span', '', (n.icon ? n.icon + ' ' : '') + pick(n, 'title')));
        b.appendChild(el('span', 'jp-pill-count', String(n.published_jobs_count || 0)));
        b.addEventListener('click', function () {
          state.filters.l1 = n.id; state.filters.l2 = ''; state.filters.l3 = '';
          loadPortalJobs(mount);
        });
        l1Pills.appendChild(b);
      });
      filterSec.appendChild(l1Pills);
    }

    // 3-Layer Cascading Dropdowns + Search
    var cGrid = el('div', 'jp-cascade-grid');
    function makeSel(label, opts, val, onChange) {
      var f = el('div', 'jp-field');
      f.appendChild(el('label', 'jp-label', label));
      var s = el('select', 'jp-select');
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

    cGrid.appendChild(makeSel('1. Main Category', [['', 'All Main Categories']].concat(l1Nodes.map(function (n) { return [n.id, pick(n, 'title') + ' (' + (n.published_jobs_count || 0) + ')']; })), state.filters.l1, function (v) {
      state.filters.l1 = v; state.filters.l2 = ''; state.filters.l3 = '';
      loadPortalJobs(mount);
    }));
    cGrid.appendChild(makeSel('2. Subcategory / Dept', [['', 'All Subcategories']].concat(l2Nodes.map(function (n) { return [n.id, pick(n, 'title') + ' (' + (n.published_jobs_count || 0) + ')']; })), state.filters.l2, function (v) {
      state.filters.l2 = v; state.filters.l3 = '';
      loadPortalJobs(mount);
    }));
    cGrid.appendChild(makeSel('3. Further Subcategory / Tenure', [['', 'All Types / Tenure']].concat(l3Nodes.map(function (n) { return [n.id, pick(n, 'title') + ' (' + (n.published_jobs_count || 0) + ')']; })), state.filters.l3, function (v) {
      state.filters.l3 = v;
      loadPortalJobs(mount);
    }));

    var qField = el('div', 'jp-field');
    qField.appendChild(el('label', 'jp-label', 'Search Recruitment'));
    var qInp = el('input', 'jp-input');
    qInp.type = 'search';
    qInp.placeholder = 'Search jobs...';
    qInp.value = state.filters.search;
    var timer = null;
    qInp.addEventListener('input', function () {
      state.filters.search = qInp.value.trim();
      clearTimeout(timer);
      timer = setTimeout(function () { loadPortalJobs(mount); }, 280);
    });
    qField.appendChild(qInp);
    cGrid.appendChild(qField);
    filterSec.appendChild(cGrid);

    // Programmatic Filter Pills (District, Qualification, Lifecycle Stage)
    if (state.facets.qualifications.length || state.facets.districts.length || hasJobs) {
      var pfRow = el('div', 'jp-pills-row');
      state.facets.qualifications.slice(0, 6).forEach(function (q) {
        var b = el('button', 'jp-filter-pill' + (state.filters.qualification === q ? ' is-active' : ''), '🎓 ' + q);
        b.type = 'button';
        b.addEventListener('click', function () {
          state.filters.qualification = state.filters.qualification === q ? '' : q;
          loadPortalJobs(mount);
        });
        pfRow.appendChild(b);
      });
      state.facets.districts.slice(0, 5).forEach(function (dist) {
        var b = el('button', 'jp-filter-pill' + (state.filters.district === dist ? ' is-active' : ''), '📍 ' + dist);
        b.type = 'button';
        b.addEventListener('click', function () {
          state.filters.district = state.filters.district === dist ? '' : dist;
          loadPortalJobs(mount);
        });
        pfRow.appendChild(b);
      });
      if (hasFilter) {
        var rst = el('button', 'jp-btn jp-btn--xs', 'Reset Filters');
        rst.type = 'button';
        rst.addEventListener('click', function () {
          state.filters = { l1: '', l2: '', l3: '', district: '', qualification: '', stage: '', search: '' };
          loadPortalJobs(mount);
        });
        pfRow.appendChild(rst);
      }
      filterSec.appendChild(pfRow);
    }

    wrap.appendChild(filterSec);

    // Jobs Grid
    if (!state.items.length) {
      var emptyCard = el('div', 'jp-card');
      emptyCard.appendChild(el('p', 'jp-muted', hasFilter ? 'No published jobs match your selected filters.' : 'No job articles published yet — publish a job from Admin Studio → Jobs Publishing House.'));
      wrap.appendChild(emptyCard);
    } else {
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

  function init() {
    var mount = document.getElementById(MOUNT_ID);
    if (!mount) return;
    state.lang = getLangPref();

    var params = new URLSearchParams(window.location.search || '');
    var slug = (params.get('slug') || '').trim();
    var previewToken = (params.get('preview_token') || '').trim();

    if (slug) {
      var artUrl = '/api/public/jobs/article?slug=' + encodeURIComponent(slug) + (previewToken ? '&preview_token=' + encodeURIComponent(previewToken) : '');
      clear(mount).appendChild(el('div', 'jp-card', 'Loading job article…'));
      Promise.all([
        fetch(artUrl, { cache: 'no-store', credentials: 'same-origin' }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); }),
        loadCandidateProfile()
      ]).then(function (pair) {
        var res = pair[0];
        if (!res.ok || !res.data || !res.data.article) {
          clear(mount).appendChild(el('div', 'jp-card', 'Job article not found or preview link has expired.'));
          return;
        }
        state.articlePayload = res.data;
        renderArticleView(mount, res.data);
        if (!res.data.is_preview) sendTelemetry('view', res.data.article);
      }).catch(function () {
        clear(mount).appendChild(el('div', 'jp-card', 'Unable to load job article right now. Please try again.'));
      });
      return;
    }

    // Listing mode
    Promise.all([
      fetch('/api/public/jobs/tree', { cache: 'no-store', credentials: 'same-origin' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
      fetch('/api/public/jobs', { cache: 'no-store', credentials: 'same-origin' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })
    ]).then(function (pair) {
      if (pair[0] && pair[0].ok) {
        state.tree = pair[0].tree || [];
        state.nodes = pair[0].nodes || [];
      }
      if (pair[1] && pair[1].ok) {
        state.items = pair[1].items || [];
        if (pair[1].facets) state.facets = pair[1].facets;
      }
      renderPortalListing(mount);
    });
  }

  window.CSOJobsPortal = { init: init, renderProse: renderProse, downloadJobIcs: downloadJobIcs };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window, document);
