(function (root) {
  'use strict';

  var SVG_NS = 'http://www.w3.org/2000/svg';

  // Clean-slate v232: purged hardcoded HUB_SUBTRACK_DOSSIERS; all dossiers load strictly from live Cloudflare D1 APIs.
  var HUB_SUBTRACK_DOSSIERS = {};

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function svgEl(tag, attrs) {
    var node = document.createElementNS(SVG_NS, tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) { node.setAttribute(k, String(attrs[k])); });
    }
    return node;
  }

  function clear(node) {
    while (node && node.firstChild) node.removeChild(node.firstChild);
    return node;
  }

  function buildVacancyBreakdown(totalVac) {
    var total = Math.max(10, Number(totalVac) || 100);
    var ur = Math.round(total * 0.50);
    var sebc = Math.round(total * 0.1125);
    var sc = Math.round(total * 0.1625);
    var st = Math.max(1, total - ur - sebc - sc);
    var women = Math.round(total * 0.33);
    return [
      { label: 'UR (50%)', count: ur },
      { label: 'SEBC (11.25%)', count: sebc },
      { label: 'SC (16.25%)', count: sc },
      { label: 'ST (22.5%)', count: st },
      { label: 'Women (33% Horiz.)', count: women }
    ];
  }

  function buildPayScaleData(job) {
    if (Array.isArray(job.payProgression) && job.payProgression.length) {
      return job.payProgression;
    }
    var hay = [job.title, job.category, job.organisation].join(' ').toLowerCase();
    if (hay.includes('opsc') || hay.includes('oas') || hay.includes('lecturer')) {
      return [
        { label: 'Selected Post (L-12)', pay: 56100 },
        { label: 'Group-B (L-10)', pay: 44900 },
        { label: 'Group-B Jr (L-9)', pay: 35400 }
      ];
    }
    if (hay.includes('ossc') || hay.includes('cgl') || hay.includes('si') || hay.includes('teacher') || hay.includes('oavs')) {
      return [
        { label: 'Selected Post (L-9)', pay: 35400 },
        { label: 'Level 7 (RI/JA)', pay: 25500 },
        { label: 'Level 4 (ARI/Amin)', pay: 19900 }
      ];
    }
    return [
      { label: 'Level 9 (OSSC)', pay: 35400 },
      { label: 'Selected Post (L-7)', pay: 25500 },
      { label: 'Level 4 (ARI/Amin)', pay: 19900 }
    ];
  }

  function getExamPatternRows(job) {
    var hay = [job.title, job.category, job.organisation].join(' ').toLowerCase();
    if (hay.includes('opsc') || hay.includes('oas')) {
      return [
        ['Prelims Pattern', 'GS Paper-I (200 Marks) + CSAT Paper-II (200 Marks, Qualifying 33%)'],
        ['Negative Marking', '1/3rd (-0.33) per wrong answer in Prelims MCQs'],
        ['Mains & Interview', 'Written Mains (Essay + 4 GS + Optional) + Personality Test (250 Marks)']
      ];
    }
    if (hay.includes('police') || hay.includes('oprb') || hay.includes('forest') || hay.includes('excise')) {
      return [
        ['Written CBT/OMR', 'Paper-I (100 Marks: EN & Odia) + Paper-II (200 Marks: GS, Reasoning, Math)'],
        ['Negative Marking', '-0.25 mark deduction per wrong answer'],
        ['Physical (PMT/PET)', 'Height, Weight, Chest Expansion (≥ 5 cm) + 1600m/3200m Run & Long Jump']
      ];
    }
    return [
      ['Written Stages', 'Preliminary Objective CBT + Main Written Examination + Computer Skill Test'],
      ['Negative Marking', '-0.25 to -0.33 per wrong MCQ as per Board Advertisement'],
      ['Document Verification', 'Original Certificates, Odisha Resident/Caste/SEBC/EWS & OTR Verification']
    ];
  }

  function renderSvgBarChart(title, rows, barClass, valuePrefix) {
    var card = el('section', 'cso-dossier-card');
    card.appendChild(el('h2', 'cso-dossier-section-title', title));
    var maxVal = Math.max(1, Math.max.apply(null, rows.map(function (r) { return r.count || r.pay || 0; })));
    var svg = svgEl('svg', { viewBox: '0 0 640 210', class: 'cso-dossier-svg', role: 'img', 'aria-label': title });

    rows.forEach(function (row, idx) {
      var val = row.count !== undefined ? row.count : row.pay;
      var y = 16 + idx * 38;
      var lbl = svgEl('text', { x: 4, y: y + 16, class: 'cso-svg-label' });
      lbl.textContent = row.label;
      svg.appendChild(lbl);

      var track = svgEl('rect', { x: 155, y: y + 2, width: 375, height: 18, rx: 6, class: 'cso-svg-track' });
      svg.appendChild(track);

      var w = Math.max(14, Math.round((val / maxVal) * 375));
      var bar = svgEl('rect', { x: 155, y: y + 2, width: w, height: 18, rx: 6, class: barClass });
      svg.appendChild(bar);

      var valTxt = svgEl('text', { x: 540, y: y + 16, class: 'cso-svg-val' });
      valTxt.textContent = (valuePrefix || '') + Number(val).toLocaleString('en-IN');
      svg.appendChild(valTxt);
    });
    card.appendChild(svg);
    return card;
  }

  function renderDossier(rootEl, job, allJobs) {
    clear(rootEl);
    var crumbTitle = document.getElementById('cso-dossier-crumb-title');
    if (crumbTitle) crumbTitle.textContent = job.title || 'Visual Dossier';
    if (typeof document !== 'undefined') {
      document.title = (job.title || 'Recruitment Dossier') + ' | Common Sense Odisha';
    }

    // 1. Visual Hero & Verified Authority Banner
    var hero = el('section', 'cso-dossier-card cso-dossier-hero');
    var top = el('div', 'cso-dossier-hero__top');

    var emblem = svgEl('svg', { viewBox: '0 0 64 64', class: 'cso-dossier-emblem', 'aria-hidden': 'true' });
    emblem.appendChild(svgEl('circle', { cx: 32, cy: 32, r: 28, class: 'cso-dossier-emblem__bg' }));
    emblem.appendChild(svgEl('circle', { cx: 32, cy: 32, r: 26, class: 'cso-dossier-emblem__ring' }));
    var embTxt = svgEl('text', { x: 32, y: 37, 'text-anchor': 'middle', class: 'cso-dossier-emblem__text' });
    embTxt.textContent = String(job.category || 'CSO').slice(0, 5).toUpperCase();
    emblem.appendChild(embTxt);
    top.appendChild(emblem);

    var badges = el('div', 'cso-dossier-badges');
    badges.appendChild(el('span', 'cso-dossier-badge cso-dossier-badge--stage', job.stage_label || 'New Recruitment'));
    var dataApi = root.CSO_JOBS_DIRECTORY_DATA;
    var secMeta = dataApi && job.section && typeof dataApi.getSectionBySlug === 'function' ? dataApi.getSectionBySlug(job.section) : null;
    if (secMeta) {
      var catLink = el('a', 'cso-dossier-badge', (secMeta.icon || '') + ' ' + secMeta.title);
      catLink.href = secMeta.href;
      badges.appendChild(catLink);
    } else if (job.category) {
      badges.appendChild(el('span', 'cso-dossier-badge', job.category));
    }
    if (job.organisation) badges.appendChild(el('span', 'cso-dossier-badge', job.organisation));
    if (job.last_date) {
      var tracker = root.CSO_DEADLINE_TRACKER;
      var days = tracker && typeof tracker.calculateDaysRemaining === 'function' ? tracker.calculateDaysRemaining(job.last_date) : null;
      var dlLabel = days !== null ? tracker.formatUrgencyLabel(days) + ' (' + job.last_date + ')' : 'Last Date: ' + job.last_date;
      badges.appendChild(el('span', 'cso-dossier-badge' + (days !== null && days <= 7 ? ' cso-dossier-badge--urgent' : ''), dlLabel));
    }
    top.appendChild(badges);
    hero.appendChild(top);

    hero.appendChild(el('h1', 'cso-dossier-title', job.title || 'Official Odisha Recruitment Notice'));
    if (job.title_or) hero.appendChild(el('p', 'cso-dossier-title-or', job.title_or));

    var actions = el('div', 'cso-dossier-actions');
    var applyUrl = job.apply_url || job.notification_url || job.source_url || 'https://www.ossc.gov.in/';
    var applyBtn = el('a', 'cso-dossier-btn cso-dossier-btn--primary', 'Official Notification PDF / Portal ↗');
    applyBtn.href = applyUrl;
    applyBtn.target = '_blank';
    applyBtn.rel = 'noopener noreferrer';
    actions.appendChild(applyBtn);

    if (root.CSO_DEADLINE_TRACKER) {
      var dlPayload = {
        id: job.slug || job.id || job.title,
        title: job.title,
        board: job.organisation || job.category || '',
        district: job.state || 'Odisha',
        lastDate: job.last_date || '',
        applyUrl: applyUrl
      };
      var tracked = root.CSO_DEADLINE_TRACKER.isTracked(dlPayload.id);
      var trackBtn = el('button', 'cso-dossier-btn' + (tracked ? ' is-tracked' : ''), tracked ? '✓ Tracked in Hub' : '📌 Track Deadline');
      trackBtn.type = 'button';
      trackBtn.addEventListener('click', function () {
        var r = root.CSO_DEADLINE_TRACKER.toggleTrack(dlPayload);
        trackBtn.classList.toggle('is-tracked', r.tracked);
        trackBtn.textContent = r.tracked ? '✓ Tracked in Hub' : '📌 Track Deadline';
      });
      actions.appendChild(trackBtn);

      if (job.last_date) {
        var icsBtn = el('button', 'cso-dossier-btn', '📅 Download .ics');
        icsBtn.type = 'button';
        icsBtn.addEventListener('click', function () { root.CSO_DEADLINE_TRACKER.downloadIcsReminder(dlPayload); });
        actions.appendChild(icsBtn);
      }
    }

    var searchParams = root.location ? new URLSearchParams(root.location.search || '') : new URLSearchParams('');
    var qSection = (searchParams.get('section') || job.section || '').trim();
    var qL1 = (searchParams.get('l1') || job.l1Code || '').trim();
    var qL2 = (searchParams.get('l2') || job.l2Code || '').trim();

    var backHref = secMeta ? secMeta.href : (qSection ? '/jobs-careers/' + encodeURIComponent(qSection) : '/jobs-careers/jobs-recruitment');
    if (qL1) {
      var backQs = new URLSearchParams();
      backQs.set('l1', qL1);
      if (qL2) backQs.set('l2', qL2);
      backHref += '?' + backQs.toString();
    }
    var backLabel = qL1
      ? '← Previous level (' + (qL2 || qL1) + ')'
      : (secMeta ? '← Back to ' + secMeta.title : '← Back to Jobs & Recruitment');
    var backBtn = el('a', 'cso-dossier-btn', backLabel);
    backBtn.href = backHref;
    actions.appendChild(backBtn);
    hero.appendChild(actions);
    rootEl.appendChild(hero);

    // 2. Pure SVG Data Graphs (Category-wise Vacancy or Marks Breakdown + 7th CPC/ORSP Pay Scale Comparison)
    var chartsGrid = el('div', 'cso-dossier-charts-grid');
    if (Array.isArray(job.marksChart) && job.marksChart.length) {
      chartsGrid.appendChild(renderSvgBarChart('UPSC CSE 3-Stage Marks Breakdown (2,025 Grand Total)', job.marksChart, 'cso-svg-bar-vac', ''));
    } else {
      chartsGrid.appendChild(renderSvgBarChart('Category-Wise Indicative Vacancy Breakdown', buildVacancyBreakdown(job.vacancies), 'cso-svg-bar-vac', ''));
    }
    chartsGrid.appendChild(renderSvgBarChart('7th CPC / ORSP Pay Matrix Basic Pay Progression', buildPayScaleData(job), 'cso-svg-bar-pay', '₹'));
    rootEl.appendChild(chartsGrid);

    // 3. 5-Step Selection Process Timeline
    var tlCard = el('section', 'cso-dossier-card');
    tlCard.appendChild(el('h2', 'cso-dossier-section-title', '5-Step Odisha Selection Process Timeline'));
    var tlGrid = el('div', 'cso-dossier-timeline');
    var activeStepIdx = job.stage === 'admit-card' ? 2 : (job.stage === 'answer-key' ? 3 : (job.stage === 'result' ? 4 : 0));
    [
      { step: 'Step 1', title: 'Notification', desc: 'Official Advt. & OTR Check' },
      { step: 'Step 2', title: 'Online Apply', desc: 'Portal Submission & Fee Waiver' },
      { step: 'Step 3', title: 'Admit Card', desc: 'Hall Ticket & Centre Logistics' },
      { step: 'Step 4', title: 'Written Exam', desc: 'CBT / OMR Prelims & Mains' },
      { step: 'Step 5', title: 'Skill / PET & DV', desc: 'Merit List & Document Verification' }
    ].forEach(function (st, idx) {
      var box = el('div', 'cso-timeline-step' + (idx === activeStepIdx ? ' is-active' : ''));
      box.appendChild(el('span', 'cso-timeline-step__num', st.step));
      box.appendChild(el('strong', '', st.title));
      box.appendChild(el('span', '', st.desc));
      tlGrid.appendChild(box);
    });
    tlCard.appendChild(tlGrid);
    rootEl.appendChild(tlCard);

    // 4. Complete Bilingual Information & Specification Tables
    var infoCard = el('section', 'cso-dossier-card');
    infoCard.appendChild(el('h2', 'cso-dossier-section-title', 'Bilingual Overview (EN + ଓଡ଼ିଆ) & Eligibility Specifications'));
    var prose = el('div', 'cso-dossier-prose');
    prose.appendChild(el('p', '', job.summary || 'Verified recruitment notice from official Odisha or Central Government portal.'));
    if (job.summary_or) prose.appendChild(el('p', '', job.summary_or));
    infoCard.appendChild(prose);

    var tblWrap = el('div', 'cso-dossier-table-wrap');
    var tbl = el('table', 'cso-dossier-table');
    var tbody = document.createElement('tbody');
    var specRows = [
      ['Recruiting Board / Authority', job.organisation || job.category || 'Govt of Odisha'],
      ['Total Vacancies', job.vacancies ? Number(job.vacancies).toLocaleString('en-IN') + ' Posts' : 'As per Official Notification'],
      ['Essential Qualification', job.qualification || 'Check Official Notification PDF'],
      ['Age Limit & Relaxation', job.age_limit || '18–38 Years (Odisha SEBC/SC/ST/Women +5 Years)'],
      ['Pay Matrix / Stipend', job.pay_level || 'ORSP 7th Pay Matrix (Level 4 – Level 12)'],
      ['Lifecycle Stage', job.stage_label || 'New Recruitment'],
      ['Application Deadline', job.last_date || 'See Official Portal']
    ];
    specRows.forEach(function (pair) {
      var tr = document.createElement('tr');
      tr.appendChild(el('th', '', pair[0]));
      tr.appendChild(el('td', '', pair[1]));
      tbody.appendChild(tr);
    });
    tbl.appendChild(tbody);
    tblWrap.appendChild(tbl);
    infoCard.appendChild(tblWrap);
    rootEl.appendChild(infoCard);

    // 5. Exam Pattern & Negative Marking Table (Multi-Row 2,025 Marks Breakdown or Branch Exam Pattern Table)
    var patCard = el('section', 'cso-dossier-card');
    var patHeading = Array.isArray(job.examStages)
      ? '3-Stage Exam Pattern & Marks Breakdown (2,025 Grand Total)'
      : (Array.isArray(job.examPatternTable) ? 'Exam Pattern, Stages & Negative Marking Blueprint' : 'Exam Pattern & Negative Marking Blueprint');
    patCard.appendChild(el('h2', 'cso-dossier-section-title', patHeading));
    var patTbl = el('table', 'cso-dossier-table');
    var patBody = document.createElement('tbody');
    var patRows = Array.isArray(job.examStages)
      ? job.examStages
      : (Array.isArray(job.examPatternTable) ? job.examPatternTable : getExamPatternRows(job));
    patRows.forEach(function (pair) {
      var tr = document.createElement('tr');
      tr.appendChild(el('th', '', pair[0]));
      tr.appendChild(el('td', '', pair[1]));
      if (pair[2]) tr.appendChild(el('td', '', pair[2]));
      patBody.appendChild(tr);
    });
    patTbl.appendChild(patBody);
    patCard.appendChild(patTbl);
    rootEl.appendChild(patCard);

    var relaxRows = Array.isArray(job.attemptMatrix) && job.attemptMatrix.length
      ? job.attemptMatrix
      : (Array.isArray(job.relaxationTable) && job.relaxationTable.length ? job.relaxationTable : null);
    if (relaxRows) {
      var attCard = el('section', 'cso-dossier-card');
      attCard.appendChild(el('h2', 'cso-dossier-section-title', Array.isArray(job.attemptMatrix) ? 'Statutory Eligibility, Age Relaxation (1st August) & Attempt Matrix' : 'Category Age Relaxation, Fee & Attempt Matrix'));
      var attTbl = el('table', 'cso-dossier-table');
      var attBody = document.createElement('tbody');
      relaxRows.forEach(function (row) {
        var tr = document.createElement('tr');
        tr.appendChild(el('th', '', row[0]));
        tr.appendChild(el('td', '', row[1]));
        tr.appendChild(el('td', '', row[2]));
        if (row[3]) tr.appendChild(el('td', '', row[3]));
        attBody.appendChild(tr);
      });
      attTbl.appendChild(attBody);
      attCard.appendChild(attTbl);
      rootEl.appendChild(attCard);
    }

    if (Array.isArray(job.physicalStandards) && job.physicalStandards.length) {
      var phyCard = el('section', 'cso-dossier-card');
      phyCard.appendChild(el('h2', 'cso-dossier-section-title', 'Physical & Medical Standards (PST / PET / Medical)'));
      var phyTbl = el('table', 'cso-dossier-table');
      var phyBody = document.createElement('tbody');
      job.physicalStandards.forEach(function (row) {
        var tr = document.createElement('tr');
        tr.appendChild(el('th', '', row[0]));
        tr.appendChild(el('td', '', row[1]));
        if (row[2]) tr.appendChild(el('td', '', row[2]));
        phyBody.appendChild(tr);
      });
      phyTbl.appendChild(phyBody);
      phyCard.appendChild(phyTbl);
      rootEl.appendChild(phyCard);
    }

    if (Array.isArray(job.serviceAllocations) && job.serviceAllocations.length) {
      var srvCard = el('section', 'cso-dossier-card');
      srvCard.appendChild(el('h2', 'cso-dossier-section-title', 'Service Allocation List (All ' + job.serviceAllocations.length + ' Services)'));
      var srvTbl = el('table', 'cso-dossier-table');
      var srvBody = document.createElement('tbody');
      job.serviceAllocations.forEach(function (srv) {
        var tr = document.createElement('tr');
        tr.appendChild(el('th', '', srv[0]));
        tr.appendChild(el('td', '', srv[1]));
        tr.appendChild(el('td', '', srv[2]));
        srvBody.appendChild(tr);
      });
      srvTbl.appendChild(srvBody);
      srvCard.appendChild(srvTbl);
      rootEl.appendChild(srvCard);
    }

    // 6. Official References & CSO Prep Tools Cards
    var toolsCard = el('section', 'cso-dossier-card');
    toolsCard.appendChild(el('h2', 'cso-dossier-section-title', Array.isArray(job.referenceLinks) ? 'Verified Official Reference Portals & CSO Prep Tools' : 'Official PDFs & CSO Candidate Prep Tools'));
    var toolsGrid = el('div', 'cso-dossier-tools-grid');
    var toolList = Array.isArray(job.referenceLinks) ? job.referenceLinks : [
      { href: '/tools/#photo-resizer', title: '📸 Photo & Signature Resizer', desc: 'Format 20–50 KB JPG for OPSC / OSSC / OSSSC OTR' },
      { href: '/tools/#orsp-salary-calculator', title: '💰 7th Pay Salary & Fee Calculator', desc: 'Compute ORSP Level 4–12 In-Hand Salary & ₹0 Fee Waiver' },
      { href: '/tools/#odisha-pet-checker', title: '🏃 Police & Forest PET Checker', desc: 'Verify Height, Weight, Chest (≥ 5 cm) & Run Targets' },
      { href: '/study-library/', title: '📚 Study Library & Odia Glossary', desc: 'Solved PYQs, 30-District GK & Administrative Glossary' }
    ];
    toolList.forEach(function (t) {
      var a = el('a', 'cso-dossier-tool-card');
      a.href = t.href;
      if (/^https?:\/\//i.test(t.href)) {
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
      }
      a.appendChild(el('strong', '', t.title));
      a.appendChild(el('span', '', t.desc));
      toolsGrid.appendChild(a);
    });
    toolsCard.appendChild(toolsGrid);
    rootEl.appendChild(toolsCard);

    // 7. Related Live Opportunities & Same-Category Pages
    var dataApiRel = root.CSO_JOBS_DIRECTORY_DATA;
    var sameSection = dataApiRel && job.section && typeof dataApiRel.getItemsBySection === 'function'
      ? dataApiRel.getItemsBySection(job.section).filter(function (j) { return j.slug !== job.slug; })
      : [];
    var pool = sameSection.length ? sameSection : (allJobs || []);
    var related = pool.filter(function (j) { return j.slug !== job.slug; }).slice(0, 4);
    if (related.length) {
      var relCard = el('section', 'cso-dossier-card');
      relCard.appendChild(el('h2', 'cso-dossier-section-title', secMeta ? 'Related ' + secMeta.title + ' Pages' : 'Related Odisha & Central Recruitment Dossiers'));
      var relGrid = el('div', 'cso-dossier-tools-grid');
      related.forEach(function (r) {
        var a = el('a', 'cso-dossier-tool-card');
        a.href = '/jobs-careers/detail/' + encodeURIComponent(r.slug || r.id);
        a.appendChild(el('strong', '', r.title));
        a.appendChild(el('span', '', (r.stage_label || 'Active') + ' · ' + (r.organisation || r.category || 'Official')));
        relGrid.appendChild(a);
      });
      relCard.appendChild(relGrid);
      rootEl.appendChild(relCard);
    }
  }

  function resolveSlugFromLocation(loc) {
    if (!loc) return '';
    var pathMatch = String(loc.pathname || '').match(/^\/jobs-careers\/detail\/([^/]+)\/?$/);
    if (pathMatch && pathMatch[1] && pathMatch[1] !== 'index.html') {
      try { return decodeURIComponent(pathMatch[1]).trim(); } catch (_) { return pathMatch[1].trim(); }
    }
    var params = new URLSearchParams(loc.search || '');
    return (params.get('slug') || params.get('id') || '').trim();
  }

  async function init() {
    var rootEl = document.getElementById('cso-dossier-root');
    if (!rootEl) return;

    var slug = resolveSlugFromLocation(root.location);

    var items = [];
    try {
      var res = await fetch('/api/content/jobs?limit=50', { credentials: 'same-origin' });
      if (res.ok) {
        var data = await res.json();
        items = Array.isArray(data.items) ? data.items : [];
      }
    } catch (_) {}

    var dataApi = root.CSO_JOBS_DIRECTORY_DATA;
    var dirItem = dataApi && typeof dataApi.getItemBySlug === 'function' ? dataApi.getItemBySlug(slug) : null;
    var matched = items.find(function (j) { return j.slug === slug || j.id === slug; })
      || dirItem
      || HUB_SUBTRACK_DOSSIERS[slug]
      || items[0]
      || null;

    if (!matched) {
      clear(rootEl);
      var emptyCard = el('article', 'cso-dossier-card cso-empty-state');
      emptyCard.appendChild(el('h2', '', 'No items published yet'));
      emptyCard.appendChild(el('p', '', 'No items published yet — add categories or content in Admin Studio.'));
      var backLink = el('a', 'cso-dossier-btn', '← Back to Jobs & Careers');
      backLink.href = '/jobs-careers/';
      emptyCard.appendChild(backLink);
      rootEl.appendChild(emptyCard);
      return;
    }

    renderDossier(rootEl, matched, items);
  }

  var api = {
    HUB_SUBTRACK_DOSSIERS: HUB_SUBTRACK_DOSSIERS,
    buildVacancyBreakdown: buildVacancyBreakdown,
    buildPayScaleData: buildPayScaleData,
    resolveSlugFromLocation: resolveSlugFromLocation,
    renderDossier: renderDossier
  };
  root.CSO_CONTENT_DOSSIER = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  }
})(typeof window !== 'undefined' ? window : globalThis);
