/* Common Sense Odisha — Restored Specialized Module Studios & Builders (admin/modules-restored.js)
   Strict CSP-compliant: ZERO .innerHTML, ZERO .style.*, ZERO inline handlers, ZERO fake seed rows.
   All tables, KPIs, and diagnostics use live D1/R2 (/api/admin/*), /admin/site-manifest.json, /sitemap.xml, /feed.xml. */
(function (window, document) {
  'use strict';

  var manifestCache = null;
  var navCache = null;

  /* ---------- Safe DOM & Utility Helpers ---------- */
  function clear(n) {
    while (n && n.firstChild) n.removeChild(n.firstChild);
    return n;
  }

  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k];
      if (v === false || v === null || v === undefined) return;
      if (k === 'class') n.className = v;
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') n.addEventListener(k.slice(2), v);
      else if (k === 'text') n.textContent = String(v);
      else n.setAttribute(k, v === true ? '' : String(v));
    });
    [].concat(kids || []).forEach(function (c) {
      if (c !== null && c !== undefined && c !== false) {
        n.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
      }
    });
    return n;
  }

  function toast(msg, kind) {
    if (typeof window.showToast === 'function') window.showToast(msg, kind || 'info');
  }

  function renderSanitizedHtml(container, htmlString) {
    clear(container);
    var raw = String(htmlString || '').trim();
    if (!raw) return;
    if (typeof DOMParser === 'undefined') {
      container.appendChild(el('p', { text: raw.replace(/<[^>]*>/g, '') }));
      return;
    }
    var ALLOWED = { P: 1, H1: 1, H2: 1, H3: 1, H4: 1, H5: 1, UL: 1, OL: 1, LI: 1, BLOCKQUOTE: 1, PRE: 1, CODE: 1, STRONG: 1, EM: 1, BR: 1, HR: 1, A: 1 };
    var DROP = { SCRIPT: 1, STYLE: 1, IFRAME: 1, OBJECT: 1, EMBED: 1, SVG: 1, MATH: 1, FORM: 1 };
    function walk(node) {
      if (!node) return null;
      if (node.nodeType === 3) return document.createTextNode(node.nodeValue || '');
      if (node.nodeType !== 1) return null;
      var tag = node.tagName.toUpperCase();
      if (DROP[tag]) return null;
      if (!ALLOWED[tag]) {
        var frag = document.createDocumentFragment();
        Array.prototype.forEach.call(node.childNodes, function (c) { var x = walk(c); if (x) frag.appendChild(x); });
        return frag;
      }
      if (tag === 'BR' || tag === 'HR') return document.createElement(tag.toLowerCase());
      if (tag === 'A') {
        var href = node.getAttribute('href') || '';
        var safe = (/^\/(?!\/)/.test(href) || /^https?:\/\//i.test(href)) ? href : null;
        var outA = document.createElement(safe ? 'a' : 'span');
        if (safe) { outA.setAttribute('href', safe); outA.setAttribute('target', '_blank'); outA.setAttribute('rel', 'noopener noreferrer'); }
        Array.prototype.forEach.call(node.childNodes, function (c) { var x = walk(c); if (x) outA.appendChild(x); });
        return outA;
      }
      var out = document.createElement(tag.toLowerCase());
      Array.prototype.forEach.call(node.childNodes, function (c) { var x = walk(c); if (x) out.appendChild(x); });
      return out;
    }
    var doc = new DOMParser().parseFromString(raw, 'text/html');
    Array.prototype.forEach.call(doc.body.childNodes, function (n) { var clean = walk(n); if (clean) container.appendChild(clean); });
  }

  async function api(method, path, body, isForm) {
    var opts = { method: method, credentials: 'same-origin', headers: { 'X-CSO-CSRF': '1' } };
    if (body !== undefined) {
      if (isForm) opts.body = body;
      else { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
    }
    var r = await fetch('/api/admin/' + path, opts);
    var d = await r.json().catch(function () { return {}; });
    if (!r.ok) {
      var err = new Error(d.error || 'HTTP ' + r.status);
      err.status = r.status;
      throw err;
    }
    return d;
  }

  async function fetchManifest() {
    if (manifestCache) return manifestCache;
    var r = await fetch('./site-manifest.json', { credentials: 'same-origin' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    manifestCache = await r.json();
    return manifestCache;
  }

  async function fetchNav() {
    if (navCache) return navCache;
    var r = await fetch('./data/master-navigation.json', { credentials: 'same-origin' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    navCache = await r.json();
    return navCache;
  }

  function downloadFile(filename, text, mime) {
    var blob = new Blob([text], { type: mime || 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = el('a', { href: url, download: filename });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function pickJsonFile(onData) {
    var inp = el('input', { type: 'file', accept: '.json,application/json', class: 'cso-hidden' });
    inp.addEventListener('change', function () {
      var f = inp.files && inp.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          onData(JSON.parse(String(reader.result || '{}')));
          toast('Configuration imported', 'success');
        } catch (e) {
          toast('Invalid JSON file: ' + e.message, 'crimson');
        }
      };
      reader.readAsText(f);
      inp.remove();
    });
    document.body.appendChild(inp);
    inp.click();
  }

  function mountCms(root, route, tabs) {
    if (!window.CSOCms) return;
    var host = el('div', { class: 'cms-embed' });
    root.appendChild(host);
    window.CSOCms.mount(host, route, tabs || null);
  }

  function addHeaderPill(actions, label) {
    if (!actions) return;
    actions.appendChild(el('span', { class: 'cso-live-pill', text: label || '● Live · D1 / R2' }));
  }

  function addHeaderBtn(actions, label, primary, fn) {
    if (!actions) return;
    actions.appendChild(el('button', {
      type: 'button',
      class: 'cso-mod-btn' + (primary ? ' cso-mod-btn-primary' : ''),
      text: label,
      onclick: fn
    }));
  }

  function kpiBox(val, lbl) {
    return el('div', { class: 'cso-mod-kpi' }, [
      el('div', { class: 'cso-mod-kpi-val', text: val }),
      el('div', { class: 'cso-mod-kpi-lbl', text: lbl })
    ]);
  }

  function badge(text, kind) {
    return el('span', { class: 'cso-mod-badge cso-mod-badge-' + (kind || 'info'), text: text });
  }

  function moduleMeta(folderId, moduleId) {
    var title = moduleId;
    var folderTitle = folderId;
    if (window.CSOStudio && typeof window.CSOStudio.getSchema === 'function') {
      var schema = window.CSOStudio.getSchema();
      if (schema && Array.isArray(schema.folders)) {
        var f = schema.folders.find(function (x) { return x.id === folderId; });
        if (f) {
          folderTitle = f.title;
          var m = f.modules.find(function (y) { return y.id === moduleId; });
          if (m) title = m.title;
        }
      }
    }
    return { folderTitle: folderTitle, title: title };
  }

  function renderBanner(shell, title, subtitle, buttons) {
    var toolbar = el('div', { class: 'cso-mod-toolbar' }, buttons || []);
    shell.appendChild(el('div', { class: 'cso-mod-banner' }, [
      el('div', {}, [
        el('h2', { class: 'cso-mod-banner-title', text: title }),
        el('p', { class: 'cso-mod-banner-sub', text: subtitle })
      ]),
      toolbar
    ]));
  }

  function safeTable(headers, rows) {
    var thead = el('thead', {}, el('tr', {}, headers.map(function (h) { return el('th', { text: h }); })));
    var tbody = el('tbody', {}, rows.length ? rows : [
      el('tr', {}, el('td', { colspan: String(headers.length), text: 'No live records found.' }))
    ]);
    return el('div', { class: 'cso-mod-table-wrap' }, el('table', { class: 'cso-mod-table' }, [thead, tbody]));
  }

  /* =========================================================================
     FOLDER 01: DASHBOARD & COMMAND CENTRE
     ========================================================================= */
  function renderLiveSiteStatus(root, actions) {
    addHeaderPill(actions, '● Live Edge Prober');
    var shell = el('div', { class: 'cso-mod-shell' });
    var tableHost = el('div', {});
    var endpoints = [
      { label: 'Public Homepage', path: '/' },
      { label: 'Jobs & Careers Hub', path: '/jobs-careers/' },
      { label: 'Student Dashboard', path: '/student-dashboard/' },
      { label: 'Current Affairs API', path: '/api/content/current-affairs' },
      { label: 'XML Sitemap', path: '/sitemap.xml' },
      { label: 'RSS Feed', path: '/feed.xml' },
      { label: 'Site Manifest', path: '/admin/site-manifest.json' },
      { label: 'Admin Stats (D1)', path: '/api/admin/stats' }
    ];

    async function runProbe() {
      clear(tableHost);
      tableHost.appendChild(el('p', { class: 'cso-mod-muted', text: 'Probing live edge endpoints…' }));
      var rows = await Promise.all(endpoints.map(async function (ep) {
        var t0 = performance.now();
        try {
          var r = await fetch(ep.path, { credentials: 'same-origin', cache: 'no-store' });
          var ms = Math.round(performance.now() - t0);
          return el('tr', {}, [
            el('td', { text: ep.label }),
            el('td', { text: ep.path }),
            el('td', {}, badge(String(r.status), r.ok ? 'ok' : 'err')),
            el('td', { text: ms + ' ms' }),
            el('td', {}, el('a', { href: ep.path, target: '_blank', rel: 'noopener noreferrer', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Open ↗' }))
          ]);
        } catch (e) {
          return el('tr', {}, [
            el('td', { text: ep.label }),
            el('td', { text: ep.path }),
            el('td', {}, badge('ERR', 'err')),
            el('td', { text: '—' }),
            el('td', { text: e.message })
          ]);
        }
      }));
      clear(tableHost);
      tableHost.appendChild(safeTable(['Endpoint', 'Path', 'HTTP', 'Latency', 'Inspect'], rows));
    }

    renderBanner(shell, 'Live Site & Edge Status', 'Real-time HTTP & latency diagnostics across public pages, XML feeds, and D1 APIs.', [
      el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-primary', text: 'Re-Run Edge Probe', onclick: runProbe })
    ]);
    shell.appendChild(tableHost);
    root.appendChild(shell);
    runProbe();
  }

  function renderQuickActions(root, actions) {
    addHeaderPill(actions, '● Live Commands');
    var shell = el('div', { class: 'cso-mod-shell' });
    renderBanner(shell, 'Command Quick Actions', 'Launch live D1/R2 workflows, run maintenance, or publish urgent site-wide alerts.');
    var grid = el('div', { class: 'cso-mod-grid-3' });
    var cards = [
      { title: 'New Job Alert', desc: 'Publish a recruitment notification to D1 & Jobs Directory.', btn: 'Create Job', fn: function () { window.CSOStudio && window.CSOStudio.openRoute('jobs/new'); } },
      { title: 'New Current Affairs', desc: 'Author daily Odisha & national updates with Markdown preview.', btn: 'Create Post', fn: function () { window.CSOStudio && window.CSOStudio.openRoute('current-affairs/new'); } },
      { title: 'New Mock Test', desc: 'Build a timed CBT exam with negative marking & questions.', btn: 'Create Exam', fn: function () { window.CSOStudio && window.CSOStudio.openRoute('mock-tests/new'); } },
      { title: 'Upload Syllabus / PYQ', desc: 'Upload official PDFs directly to Cloudflare R2.', btn: 'Upload PDF', fn: function () { window.CSOStudio && window.CSOStudio.openRoute('syllabus'); } },
      { title: 'Homepage Broadcast', desc: 'Configure or deactivate the live top announcement bar.', btn: 'Open Banner', fn: function () { window.CSOStudio && window.CSOStudio.openRoute('banner'); } },
      {
        title: 'Run D1 Maintenance',
        desc: 'Trigger lifecycle expiry & scheduled publication sweep.',
        btn: 'Run Maintenance',
        fn: async function () {
          try {
            var res = await api('POST', 'maintenance/run');
            toast('Maintenance complete: ' + JSON.stringify(res.expired_jobs || 0) + ' expired', 'success');
          } catch (e) {
            toast('Maintenance failed: ' + e.message, 'crimson');
          }
        }
      }
    ];
    cards.forEach(function (c) {
      grid.appendChild(el('div', { class: 'cso-mod-card' }, [
        el('h3', { text: c.title }),
        el('p', { class: 'cso-mod-muted', text: c.desc }),
        el('div', {}, el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-primary', text: c.btn, onclick: c.fn }))
      ]));
    });
    shell.appendChild(grid);
    root.appendChild(shell);
  }

  function renderPendingApprovals(root, actions) {
    addHeaderPill(actions, '● Live D1 Queue');
    var shell = el('div', { class: 'cso-mod-shell' });
    var listHost = el('div', {});

    async function loadQueue() {
      clear(listHost);
      listHost.appendChild(el('p', { class: 'cso-mod-muted', text: 'Loading draft & scheduled items from D1…' }));
      try {
        var [ca, jobs, tests] = await Promise.all([
          api('GET', 'current-affairs?limit=50'),
          api('GET', 'jobs?limit=50'),
          api('GET', 'mock-tests?limit=50')
        ]);
        var items = [];
        (ca.items || []).forEach(function (x) { if (x.status !== 'published') items.push({ kind: 'current-affairs', label: 'Current Affairs', item: x }); });
        (jobs.items || []).forEach(function (x) { if (x.status !== 'published') items.push({ kind: 'jobs', label: 'Job Alert', item: x }); });
        (tests.items || []).forEach(function (x) { if (x.status !== 'published') items.push({ kind: 'mock-tests', label: 'Mock Test', item: x }); });

        var rows = items.map(function (entry) {
          var it = entry.item;
          return el('tr', {}, [
            el('td', {}, badge(entry.label, 'info')),
            el('td', { text: it.title || it.slug || it.id }),
            el('td', {}, badge(it.status || 'draft', it.status === 'scheduled' ? 'warn' : 'info')),
            el('td', { text: it.updated_at || '—' }),
            el('td', {}, el('button', {
              type: 'button',
              class: 'cso-mod-btn cso-mod-btn-primary cso-mod-btn-sm',
              text: 'Approve & Publish',
              onclick: async function () {
                try {
                  await api('POST', entry.kind + '/' + encodeURIComponent(it.id) + '/status', { status: 'published' });
                  toast('Published: ' + (it.title || it.id), 'success');
                  loadQueue();
                } catch (e) {
                  toast(e.message, 'crimson');
                }
              }
            }))
          ]);
        });
        clear(listHost);
        listHost.appendChild(safeTable(['Type', 'Title', 'Status', 'Updated', 'Action'], rows));
      } catch (e) {
        clear(listHost);
        listHost.appendChild(el('p', { class: 'cso-mod-muted', text: 'Error loading queue: ' + e.message }));
      }
    }

    renderBanner(shell, 'Pending Approvals & Moderation Queue', 'Live D1 drafts and scheduled items awaiting publication.', [
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'Refresh Queue', onclick: loadQueue })
    ]);
    shell.appendChild(listHost);
    root.appendChild(shell);
    loadQueue();
  }

  function renderWebsiteAnalytics(root, actions) {
    addHeaderPill(actions, '● Live D1 Telemetry');
    var shell = el('div', { class: 'cso-mod-shell' });
    var bodyHost = el('div', { class: 'cso-mod-shell' });

    async function loadAnalytics() {
      clear(bodyHost);
      try {
        var stats = await api('GET', 'stats');
        var kpis = el('div', { class: 'cso-mod-grid-4' }, [
          kpiBox(String((stats.current_affairs && stats.current_affairs.live) || 0), 'Live Current Affairs'),
          kpiBox(String((stats.jobs && stats.jobs.live) || 0), 'Active Job Alerts'),
          kpiBox(String((stats.mock_tests && stats.mock_tests.live) || 0), 'Published Mock Tests'),
          kpiBox(String(stats.scheduled_pending || 0), 'Scheduled Pending')
        ]);
        bodyHost.appendChild(kpis);

        if (window.CSOCharts) {
          var chartCard = el('div', { class: 'cso-mod-grid-2' });
          var barWrap = el('div', { class: 'cso-mod-card' }, [el('h3', { text: 'Live Content Distribution (D1)' })]);
          var barMount = el('div', {});
          barWrap.appendChild(barMount);
          if (typeof window.CSOCharts.renderBarChart === 'function') {
            window.CSOCharts.renderBarChart(barMount, [
              { label: 'CA Live', value: (stats.current_affairs && stats.current_affairs.live) || 0 },
              { label: 'CA Total', value: (stats.current_affairs && stats.current_affairs.total) || 0 },
              { label: 'Jobs Live', value: (stats.jobs && stats.jobs.live) || 0 },
              { label: 'Jobs Exp', value: (stats.jobs && stats.jobs.expired) || 0 },
              { label: 'Mocks Live', value: (stats.mock_tests && stats.mock_tests.live) || 0 }
            ]);
          }
          chartCard.appendChild(barWrap);

          var donutWrap = el('div', { class: 'cso-mod-card' }, [el('h3', { text: 'Recent Audit Events' })]);
          var auditRows = (stats.recent_audit || []).slice(0, 6).map(function (a) {
            return el('tr', {}, [
              el('td', { text: a.action }),
              el('td', { text: a.actor_email || 'system' }),
              el('td', { text: a.created_at || '—' })
            ]);
          });
          donutWrap.appendChild(safeTable(['Action', 'Actor', 'Timestamp'], auditRows));
          chartCard.appendChild(donutWrap);
          bodyHost.appendChild(chartCard);
        }
      } catch (e) {
        bodyHost.appendChild(el('p', { class: 'cso-mod-muted', text: 'Failed to load live stats: ' + e.message }));
      }
    }

    renderBanner(shell, 'Website Analytics & D1 Telemetry', 'Zero-cookie live D1 metrics and audit telemetry.', [
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'Refresh Metrics', onclick: loadAnalytics })
    ]);
    shell.appendChild(bodyHost);
    root.appendChild(shell);
    loadAnalytics();
  }

  function renderMasterRegistry(root, actions) {
    addHeaderPill(actions, '● 23 Folders · Live Schema');
    var shell = el('div', { class: 'cso-mod-shell' });
    var searchInp = el('input', { type: 'text', class: 'cso-mod-input', placeholder: 'Search module ID, title, or folder…' });
    var tableHost = el('div', {});

    async function init() {
      var nav = await fetchNav();
      var allRows = [];
      (nav.folders || []).forEach(function (f) {
        (f.modules || []).forEach(function (m) {
          allRows.push({ folderId: f.id, folderTitle: f.title, id: m.id, title: m.title });
        });
      });

      function draw() {
        var q = searchInp.value.toLowerCase().trim();
        var filtered = allRows.filter(function (r) {
          return !q || r.id.toLowerCase().includes(q) || r.title.toLowerCase().includes(q) || r.folderTitle.toLowerCase().includes(q);
        });
        var rows = filtered.slice(0, 120).map(function (r) {
          return el('tr', {}, [
            el('td', { text: r.id }),
            el('td', { text: r.title }),
            el('td', { text: r.folderTitle }),
            el('td', {}, badge('Restored', 'ok')),
            el('td', {}, el('button', {
              type: 'button',
              class: 'cso-mod-btn cso-mod-btn-sm',
              text: 'Open Module',
              onclick: function () { if (window.selectModule) window.selectModule(r.folderId, r.id); }
            }))
          ]);
        });
        clear(tableHost);
        tableHost.appendChild(el('p', { class: 'cso-mod-muted', text: 'Showing ' + rows.length + ' of ' + filtered.length + ' matching modules (' + allRows.length + ' total).' }));
        tableHost.appendChild(safeTable(['Module ID', 'Title', 'Folder', 'Status', 'Launch'], rows));
      }

      searchInp.addEventListener('input', draw);
      draw();
    }

    renderBanner(shell, 'Master Feature Registry', 'Complete inventory of all 23 sidebar folders and restored modules.');
    shell.appendChild(el('div', { class: 'cso-mod-card' }, [searchInp, tableHost]));
    root.appendChild(shell);
    init().catch(function (e) { toast(e.message, 'crimson'); });
  }

  /* =========================================================================
     FOLDER 02: WEBSITE PAGES & BUILDER (module-02-001..011)
     ========================================================================= */
  var f02State = { builderRoute: null, createTemplate: null, builderTemplate: null };

  var F02_TEMPLATES = [
    {
      id: 'ossc-recruitment',
      name: 'OSSC / OSSSC Recruitment Notification',
      category: 'Core Portal',
      meta_description: 'Official Odisha recruitment notification, vacancy breakdown, eligibility, important dates, and direct apply link.',
      hero_title: 'OSSC / OSSSC Recruitment 2026 — Official Notification',
      hero_subtitle: 'Verified vacancy details, age limit, educational qualification, and online application schedule.',
      cta_label: 'Apply Online Now',
      cta_url: '/jobs-careers/',
      blocks: [
        { type: 'hero', title: 'Odisha Recruitment Notification 2026', text: 'Complete official notification summary and key dates for Odisha aspirants.', label: 'View Official PDF', url: '/jobs-careers/' },
        { type: 'notice', title: 'Important Dates & Fee', text: 'Check application start date, last date, and examination fee structure before applying.' },
        { type: 'ticker', title: 'Latest Odisha Govt Job Alerts' },
        { type: 'faq', title: 'Recruitment FAQs', items: ['Who can apply?|Candidates meeting age and educational criteria as per official notification.', 'How to download admit card?|Log in to the commission portal using your registration number.'] }
      ]
    },
    {
      id: 'opsc-oas-hub',
      name: 'OPSC OAS Exam & Syllabus Hub',
      category: 'Core Portal',
      meta_description: 'OPSC OAS Prelims & Mains syllabus, exam pattern, previous year question papers, and preparation strategy.',
      hero_title: 'OPSC Odisha Civil Services (OAS) Hub',
      hero_subtitle: 'Complete Prelims, Mains & Interview syllabus, PYQ archives, and free mock tests.',
      cta_label: 'Start OAS Mock Test',
      cta_url: '/mock-tests/',
      blocks: [
        { type: 'hero', title: 'OPSC OAS 2026 Preparation Hub', text: 'Structured syllabus, Odisha GK notes, and bilingual test series.', label: 'Explore Syllabus', url: '/syllabus/' },
        { type: 'examgrid', title: 'OAS Quick Links', items: ['Prelims Syllabus|/syllabus/', 'Previous Year Papers|/pyq/', 'Daily Current Affairs|/current-affairs/', 'Free Mock Tests|/mock-tests/'] },
        { type: 'cbt', title: 'Practice OPSC Prelims CBT', text: 'Attempt timed GS Paper I & CSAT mock tests with instant scorecard.', label: 'Launch CBT', url: '/mock-tests/' }
      ]
    },
    {
      id: 'cbt-mock-portal',
      name: 'Free CBT Mock Test Portal',
      category: 'Candidate Workspace',
      meta_description: 'Free bilingual Odia & English CBT mock tests for OSSC CGL, OSSSC RI/ARI, OPSC OAS, and Odisha Police.',
      hero_title: 'Free Odisha CBT Mock Test Series',
      hero_subtitle: 'Real exam interface with timer, negative marking, and detailed solutions.',
      cta_label: 'Attempt Free Test',
      cta_url: '/mock-tests/',
      blocks: [
        { type: 'cbt', title: 'Full-Length Odisha Exam CBT', text: 'Practice OSSC CGL, RI/ARI, Amin, and Constable papers in real-time mode.', label: 'Start Test Now', url: '/mock-tests/' },
        { type: 'examgrid', title: 'Available Test Series', items: ['OSSC CGLRE Prelims|/mock-tests/', 'OSSSC Combined Exam|/mock-tests/', 'Odisha Police SI|/mock-tests/', 'OTET & OSSTET|/mock-tests/'] },
        { type: 'richtext', text: 'All mock tests are updated regularly as per the latest OSSC, OSSSC, and OPSC exam patterns.' }
      ]
    },
    {
      id: 'odisha-scheme-guide',
      name: 'Odisha Govt Scheme & Scholarship Guide',
      category: 'Core Portal',
      meta_description: 'Eligibility, required documents, benefits, and step-by-step online application guide for Odisha government schemes.',
      hero_title: 'Odisha Government Scheme & Scholarship Guide',
      hero_subtitle: 'Verified eligibility rules, document checklist, and official portal links.',
      cta_label: 'Check Eligibility',
      cta_url: '/schemes/',
      blocks: [
        { type: 'hero', title: 'Odisha Welfare & Scholarship Guide', text: 'Step-by-step application instructions and beneficiary status check.', label: 'Open Schemes Portal', url: '/schemes/' },
        { type: 'notice', title: 'Required Documents', text: 'Keep Aadhaar card, residence certificate, income certificate, and bank passbook ready.' },
        { type: 'faq', title: 'Scheme FAQs', items: ['Where to apply?|Apply only through the official Odisha state portal.', 'Is there any application fee?|No, government welfare and scholarship applications are free.'] }
      ]
    },
    {
      id: 'admit-card-tracker',
      name: 'Admit Card & Result Tracker',
      category: 'Core Portal',
      meta_description: 'Direct official links to download Odisha exam admit cards, hall tickets, answer keys, and merit lists.',
      hero_title: 'Odisha Exam Admit Card & Result Tracker',
      hero_subtitle: 'Fast, verified links to commission hall tickets and final selection lists.',
      cta_label: 'Check Live Results',
      cta_url: '/jobs-careers/',
      blocks: [
        { type: 'ticker', title: 'Live Admit Card & Result Updates' },
        { type: 'examgrid', title: 'Official Commission Portals', items: ['OSSC Portal|/jobs-careers/', 'OSSSC Portal|/jobs-careers/', 'OPSC Portal|/jobs-careers/', 'Student Dashboard|/student-dashboard/'] },
        { type: 'notice', title: 'Candidate Advisory', text: 'Always verify your roll number and exam centre on the official PDF before exam day.' }
      ]
    },
    {
      id: 'official-notice-faq',
      name: 'Official Notice & FAQ Page',
      category: 'Information & Legal',
      meta_description: 'Official portal notice, candidate guidelines, and frequently asked questions for Common Sense Odisha.',
      hero_title: 'Official Notice & Candidate Guidelines',
      hero_subtitle: 'Clear answers on portal access, mock tests, and official verification.',
      cta_label: 'Contact Support',
      cta_url: '/contact.html',
      blocks: [
        { type: 'notice', title: 'Portal Verification Notice', text: 'Common Sense Odisha provides verified educational guides and official commission links.' },
        { type: 'richtext', text: 'Use this page template for statutory notices, exam advisories, or candidate helpdesks.' },
        { type: 'faq', title: 'Frequently Asked Questions', items: ['How do I report an error?|Reach out via the Contact Us page with the page URL.', 'Are study resources free?|Yes, core syllabus, PYQs, and job alerts are free for Odisha aspirants.'] }
      ]
    }
  ];

  function f02NormalizeRoute(r) {
    var s = String(r || '').trim();
    if (!s) return '/';
    if (!s.startsWith('/')) s = '/' + s;
    s = s.replace(/\/{2,}/g, '/');
    if (s !== '/' && !s.endsWith('/') && !/\.[a-z0-9]{2,5}$/i.test(s)) s += '/';
    return s;
  }

  function f02ParseBlocks(raw) {
    if (Array.isArray(raw)) return raw;
    try {
      var parsed = JSON.parse(raw || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function f02StatusBadge(status) {
    var s = status || 'published';
    var kind = s === 'published' ? 'ok' : (s === 'scheduled' ? 'warn' : (s === 'archived' || s === 'trash' ? 'danger' : 'info'));
    return badge(s, kind);
  }

  function f02SourceBadge(source) {
    var s = source || 'static';
    var kind = s === 'override' ? 'warn' : (s === 'dynamic' ? 'ok' : 'info');
    return badge(s, kind);
  }

  /* -------------------------------------------------------------------------
     02-001: All Pages (Live D1 + Manifest merged inventory + Quick Edit)
     ------------------------------------------------------------------------- */
  function renderAllPagesStudio(root, actions) {
    addHeaderPill(actions, '● Live Pages API');
    var shell = el('div', { class: 'cso-mod-shell' });
    var kpiHost = el('div', { class: 'cso-mod-grid-4' });
    var drawerHost = el('div', {});
    var tableHost = el('div', {});

    var allPages = [];
    var selected = {};
    var state = { q: '', cat: '', status: '', page: 0, pageSize: '15' };
    var searchInp = el('input', { type: 'search', class: 'cso-mod-input', placeholder: 'Search title, route, or meta description…' });
    var pageSizeSel = el('select', { class: 'cso-mod-select' }, [
      el('option', { value: '15', text: '15 per page' }),
      el('option', { value: '25', text: '25 per page' }),
      el('option', { value: 'all', text: 'All pages' })
    ]);
    var catRow = el('div', { class: 'cso-pill-row' });
    var statusRow = el('div', { class: 'cso-pill-row' });

    function isSeoReady(p) {
      var tl = (p.title || '').trim().length;
      var dl = (p.meta_description || '').trim().length;
      return tl >= 20 && tl <= 70 && dl >= 70 && dl <= 170;
    }

    function exportPagesJson() {
      downloadFile('cso-pages-manifest-' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify(allPages, null, 2));
      toast('Pages JSON exported', 'success');
    }

    function exportPagesCsv() {
      var lines = ['route,title,category,status,source,seo_ready,meta_description'];
      allPages.forEach(function (p) {
        lines.push([p.route, p.title || '', p.category || '', p.status || 'published', p.source || 'static', isSeoReady(p) ? 'ready' : 'needs_meta', p.meta_description || ''].map(csvCell).join(','));
      });
      downloadFile('cso-pages-manifest.csv', lines.join('\n'), 'text/csv');
      toast('Pages CSV exported', 'success');
    }

    async function bulkSetStatus(targetStatus) {
      var routes = Object.keys(selected);
      if (!routes.length) { toast('Select at least one page', 'amber'); return; }
      var ok = 0, bad = [];
      for (var i = 0; i < routes.length; i++) {
        var p = selected[routes[i]];
        try {
          await api('PUT', 'pages', Object.assign({}, p, { route: p.route, status: targetStatus, publish_at: null, note: 'Bulk ' + targetStatus + ' from All Pages' }));
          ok++;
        } catch (e) { bad.push(p.route + ': ' + e.message); }
      }
      toast(ok + ' pages set to ' + targetStatus + (bad.length ? ' (' + bad.length + ' failed)' : ''), bad.length ? 'amber' : 'success');
      selected = {};
      await loadPages();
    }

    function openPageStudioDrawer(p) {
      clear(drawerHost);
      var mobile = false;
      var titleInp = el('input', { type: 'text', class: 'cso-mod-input', value: p.title || '' });
      var metaInp = el('textarea', { class: 'cso-mod-textarea', rows: '3', text: p.meta_description || '' });
      var catSel = el('select', { class: 'cso-mod-select' }, [
        'Core Portal', 'Candidate Workspace', 'Information & Legal', 'Exam Guide', 'Recruitment'
      ].map(function (c) { return el('option', { value: c, text: c, selected: p.category === c }); }));
      var heroTitleInp = el('input', { type: 'text', class: 'cso-mod-input', value: p.hero_title || '' });
      var heroSubInp = el('input', { type: 'text', class: 'cso-mod-input', value: p.hero_subtitle || '' });
      var statusSel = el('select', { class: 'cso-mod-select' }, [
        'published', 'draft', 'scheduled', 'archived', 'trash'
      ].map(function (s) { return el('option', { value: s, text: s, selected: (p.status || 'published') === s }); }));

      var titleMeter = el('div', { class: 'cso-mod-toolbar' });
      var metaMeter = el('div', { class: 'cso-mod-toolbar' });
      var rightPane = el('div', { class: 'cso-mod-card' });
      var revHost = el('div', { class: 'cso-mod-shell' });

      var deskBtn = el('button', { type: 'button', class: 'cso-pill cso-pill-active', text: 'Desktop', onclick: function () { mobile = false; syncVp(); renderRight(); } });
      var mobBtn = el('button', { type: 'button', class: 'cso-pill', text: 'Mobile 375px', onclick: function () { mobile = true; syncVp(); renderRight(); } });
      function syncVp() {
        deskBtn.classList.toggle('cso-pill-active', !mobile);
        mobBtn.classList.toggle('cso-pill-active', mobile);
      }

      function updateMeters() {
        var tl = titleInp.value.trim().length, dl = metaInp.value.trim().length;
        clear(titleMeter);
        titleMeter.appendChild(el('span', { class: 'cso-mod-muted', text: tl + ' chars (optimal 50–60)' }));
        titleMeter.appendChild(badge(tl >= 50 && tl <= 60 ? 'Optimal ✓' : tl >= 20 && tl <= 70 ? 'Acceptable' : tl < 20 ? 'Too short' : 'Too long', tl >= 50 && tl <= 60 ? 'ok' : 'warn'));
        clear(metaMeter);
        metaMeter.appendChild(el('span', { class: 'cso-mod-muted', text: dl + ' chars (optimal 145–160)' }));
        metaMeter.appendChild(badge(dl >= 145 && dl <= 160 ? 'Optimal ✓' : dl >= 70 && dl <= 170 ? 'Acceptable' : dl < 70 ? 'Too short' : 'Too long', dl >= 145 && dl <= 160 ? 'ok' : 'warn'));
      }

      var src = p.route + (p.route.indexOf('?') === -1 ? '?' : '&') + 'preview=1&t=' + Date.now();
      var frameEl = el('iframe', { src: src, class: 'cso-preview-frame', title: 'Live Preview: ' + p.route });
      var serpUrl = el('div', { class: 'cso-serp-url', text: 'https://csodisha.com' + p.route });
      var serpTitle = el('div', { class: 'cso-serp-title', text: p.title || p.route });
      var serpDesc = el('p', { class: 'cso-serp-desc', text: p.meta_description || 'No meta description set.' });
      var ogTitle = el('strong', { text: p.title || p.route });
      var ogDesc = el('p', { class: 'cso-mod-muted', text: p.meta_description || 'No meta description set.' });
      var heroPreview = el('div', { class: 'cso-mod-muted', text: '' });

      rightPane.appendChild(el('div', { class: 'cso-mod-label', text: 'Google SERP Result Preview' }));
      rightPane.appendChild(el('div', { class: 'cso-serp-card' }, [serpUrl, serpTitle, serpDesc]));
      rightPane.appendChild(el('div', { class: 'cso-mod-label', text: 'OpenGraph Social Share Preview' }));
      rightPane.appendChild(el('div', { class: 'cso-og-card' }, [
        el('div', { class: 'cso-preview-kicker', text: 'CSODISHA.COM · ' + String(p.category || 'PORTAL').toUpperCase() }),
        ogTitle, ogDesc, heroPreview
      ]));
      rightPane.appendChild(el('div', { class: 'cso-mod-label', text: 'Live Route <iframe> Preview' }));
      rightPane.appendChild(el('div', { class: 'cso-preview-frame-wrap' }, [frameEl]));

      function renderRight() {
        updateMeters();
        var t = titleInp.value.trim() || p.route;
        var d = metaInp.value.trim() || 'No meta description set — add 145–160 chars for optimal search snippets.';
        serpTitle.textContent = t;
        serpDesc.textContent = d;
        ogTitle.textContent = t;
        ogDesc.textContent = d;
        heroPreview.textContent = heroTitleInp.value.trim() ? ('Hero: ' + heroTitleInp.value.trim() + (heroSubInp.value.trim() ? ' — ' + heroSubInp.value.trim() : '')) : '';
        frameEl.className = mobile ? 'cso-preview-frame-mobile' : 'cso-preview-frame';
      }

      async function savePageWithStatus(targetStatus) {
        try {
          await api('PUT', 'pages', Object.assign({}, p, {
            route: p.route,
            title: titleInp.value.trim(),
            meta_description: metaInp.value.trim(),
            category: catSel.value,
            hero_title: heroTitleInp.value.trim(),
            hero_subtitle: heroSubInp.value.trim(),
            status: targetStatus || statusSel.value,
            publish_at: null,
            note: 'Page Studio Drawer (' + (targetStatus || statusSel.value) + ')'
          }));
          toast(targetStatus === 'published' ? 'Published live to Edge: ' + p.route : 'Saved draft: ' + p.route, 'success');
          clear(drawerHost);
          await loadPages();
        } catch (e) { toast(e.message, 'crimson'); }
      }

      var leftPane = el('div', { class: 'cso-mod-card' }, [
        el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'SEO Title' }), titleInp, titleMeter]),
        el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Meta Description' }), metaInp, metaMeter]),
        el('div', { class: 'cso-mod-grid-2' }, [
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Hero Headline' }), heroTitleInp]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Hero Subheadline' }), heroSubInp])
        ]),
        el('div', { class: 'cso-mod-grid-2' }, [
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Category' }), catSel]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Status' }), statusSel])
        ]),
        el('div', { class: 'cso-mod-toolbar' }, [
          el('button', { type: 'button', class: 'cso-mod-btn', text: 'Save Draft (Unpublished)', onclick: function () { savePageWithStatus('draft'); } }),
          el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-primary', text: 'Publish Live to Edge', onclick: function () { savePageWithStatus('published'); } }),
          el('button', { type: 'button', class: 'cso-mod-btn', text: 'Open in Visual Builder', onclick: function () { f02State.builderRoute = p.route; window.selectModule && window.selectModule('folder-02', 'module-02-003'); } })
        ]),
        el('details', {}, [
          el('summary', { class: 'cso-mod-label', text: 'Revision History & 1-Click Rollback (' + (p.revisions || 0) + ' saved)' }),
          revHost
        ])
      ]);

      drawerHost.appendChild(el('div', { class: 'cso-drawer' }, [
        el('div', { class: 'cso-drawer-head' }, [
          el('div', {}, [el('strong', { text: 'Page Studio & Pre-Publish Preview — ' }), el('code', { text: p.route }), f02SourceBadge(p.source), f02StatusBadge(p.status)]),
          el('div', { class: 'cso-mod-toolbar' }, [
            deskBtn, mobBtn,
            el('a', { href: p.route, target: '_blank', rel: 'noopener noreferrer', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Open Live ↗' }),
            el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Close', onclick: function () { clear(drawerHost); } })
          ])
        ]),
        el('div', { class: 'cso-mod-grid-2' }, [leftPane, rightPane])
      ]));

      [titleInp, metaInp, heroTitleInp, heroSubInp].forEach(function (inp) {
        inp.addEventListener('input', renderRight);
      });
      renderRight();

      revHost.appendChild(el('p', { class: 'cso-mod-muted', text: 'Loading revisions…' }));
      api('GET', 'pages/revisions?route=' + encodeURIComponent(p.route)).then(function (res) {
        clear(revHost);
        var revs = res.revisions || [];
        if (!revs.length) {
          revHost.appendChild(el('p', { class: 'cso-mod-muted', text: 'No D1 revisions recorded yet for this route.' }));
          return;
        }
        revs.slice(0, 8).forEach(function (rv) {
          revHost.appendChild(el('div', { class: 'cso-drawer-head' }, [
            el('div', {}, [
              el('strong', { text: '#' + rv.id + ' · ' + (rv.note || 'Page update') }),
              el('div', { class: 'cso-mod-muted', text: (rv.editor_email || 'staff') + ' · ' + (rv.created_at || '') })
            ]),
            el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Rollback', onclick: async function () {
              try {
                await api('POST', 'pages/restore', { route: p.route, revision_id: rv.id, status: 'published' });
                toast('Rolled back to revision #' + rv.id, 'success');
                clear(drawerHost);
                await loadPages();
              } catch (e) { toast(e.message, 'crimson'); }
            } })
          ]));
        });
      }).catch(function () { clear(revHost); });
    }

    function renderPills() {
      clear(catRow);
      catRow.appendChild(el('span', { class: 'cso-mod-muted', text: 'Category:' }));
      var cats = [''].concat(['Core Portal', 'Candidate Workspace', 'Information & Legal', 'Exam Guide', 'Recruitment']);
      cats.forEach(function (c) {
        catRow.appendChild(el('button', {
          type: 'button',
          class: 'cso-pill' + (state.cat === c ? ' is-active' : ''),
          text: c || 'All',
          onclick: function () { state.cat = c; state.page = 0; renderPills(); drawTable(); }
        }));
      });

      clear(statusRow);
      statusRow.appendChild(el('span', { class: 'cso-mod-muted', text: 'Status:' }));
      ['', 'published', 'draft', 'scheduled', 'trash'].forEach(function (s) {
        statusRow.appendChild(el('button', {
          type: 'button',
          class: 'cso-pill' + (state.status === s ? ' is-active' : ''),
          text: s || 'All',
          onclick: function () { state.status = s; state.page = 0; renderPills(); drawTable(); }
        }));
      });
    }

    function drawTable() {
      clear(tableHost);
      var term = state.q.toLowerCase().trim();
      var filtered = allPages.filter(function (p) {
        if (state.cat && p.category !== state.cat) return false;
        if (state.status) {
          if (state.status === 'trash') {
            if (p.status !== 'trash' && p.status !== 'archived') return false;
          } else if ((p.status || 'published') !== state.status) return false;
        }
        if (!term) return true;
        return (p.title || '').toLowerCase().indexOf(term) !== -1 ||
          (p.route || '').toLowerCase().indexOf(term) !== -1 ||
          (p.meta_description || '').toLowerCase().indexOf(term) !== -1;
      });

      var pSize = state.pageSize === 'all' ? Math.max(filtered.length, 1) : Number(state.pageSize) || 15;
      var totalPages = Math.max(1, Math.ceil(filtered.length / pSize));
      if (state.page >= totalPages) state.page = totalPages - 1;
      var slice = filtered.slice(state.page * pSize, (state.page + 1) * pSize);

      var rows = slice.map(function (p) {
        var ready = isSeoReady(p);
        return el('tr', {}, [
          el('td', {}, el('input', {
            type: 'checkbox',
            checked: selected[p.route] ? true : false,
            onchange: function (e) { if (e.target.checked) selected[p.route] = p; else delete selected[p.route]; }
          })),
          el('td', {}, [
            el('strong', { text: p.title || p.route }),
            el('div', { class: 'cso-inline-row' }, [el('code', { text: p.route }), f02SourceBadge(p.source)])
          ]),
          el('td', { text: p.category || '—' }),
          el('td', {}, [
            f02StatusBadge(p.status),
            p.revisions ? el('span', { class: 'cso-mod-muted', text: ' · ' + p.revisions + ' rev' }) : null
          ]),
          el('td', {}, badge(ready ? 'SEO Ready ✓' : 'Needs Meta', ready ? 'ok' : 'warn')),
          el('td', { text: (p.meta_description || '').slice(0, 64) + ((p.meta_description || '').length > 64 ? '…' : '') || '—' }),
          el('td', {}, el('div', { class: 'cso-mod-toolbar' }, [
            el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm cso-mod-btn-primary', text: 'Edit', onclick: function () { openPageStudioDrawer(p); } }),
            el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Preview', onclick: function () { openPageStudioDrawer(p); } }),
            el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Builder', onclick: function () { f02State.builderRoute = p.route; window.selectModule && window.selectModule('folder-02', 'module-02-003'); } }),
            el('a', { href: p.route, target: '_blank', rel: 'noopener noreferrer', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Open Live ↗' }),
            (p.status !== 'trash' && p.status !== 'archived') ? el('button', {
              type: 'button',
              class: 'cso-mod-btn cso-mod-btn-danger cso-mod-btn-sm',
              text: 'Trash',
              onclick: async function () {
                try {
                  await api('PUT', 'pages', { route: p.route, status: 'trash', note: 'Moved to trash' });
                  toast('Moved to Trash: ' + p.route, 'success');
                  await loadPages();
                } catch (e) { toast(e.message, 'crimson'); }
              }
            }) : null
          ]))
        ]);
      });

      tableHost.appendChild(el('div', { class: 'cso-drawer-head' }, [
        el('span', { class: 'cso-mod-muted', text: 'Showing ' + (filtered.length ? state.page * pSize + 1 : 0) + '–' + Math.min((state.page + 1) * pSize, filtered.length) + ' of ' + filtered.length + ' matching routes (' + allPages.length + ' total)' }),
        el('div', { class: 'cso-mod-toolbar' }, [
          el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: '← Prev', disabled: state.page <= 0, onclick: function () { if (state.page > 0) { state.page--; drawTable(); } } }),
          el('span', { class: 'cso-mod-muted', text: 'Page ' + (state.page + 1) + ' / ' + totalPages }),
          el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Next →', disabled: state.page >= totalPages - 1, onclick: function () { if (state.page < totalPages - 1) { state.page++; drawTable(); } } })
        ])
      ]));
      tableHost.appendChild(safeTable(['Select', 'Page & Route', 'Category', 'Status', 'SEO Health', 'Meta Description', 'Actions'], rows));
    }

    async function loadPages() {
      clear(tableHost);
      tableHost.appendChild(el('p', { class: 'cso-mod-muted', text: 'Loading live pages from /api/admin/pages…' }));
      try {
        var d = await api('GET', 'pages');
        allPages = d.pages || [];
        var liveCount = allPages.filter(function (p) { return !p.status || p.status === 'published'; }).length;
        var drafts = allPages.filter(function (p) { return p.status === 'draft' || p.status === 'scheduled'; }).length;
        var seoReady = allPages.filter(isSeoReady).length;
        var seoPct = allPages.length ? Math.round((seoReady / allPages.length) * 100) : 100;

        clear(kpiHost);
        [
          ['Total Pages', allPages.length],
          ['Published Live', liveCount],
          ['Drafts & Scheduled', drafts],
          ['SEO Optimal %', seoPct + '%']
        ].forEach(function (k) {
          kpiHost.appendChild(el('div', { class: 'cso-mod-kpi' }, [
            el('div', { class: 'cso-mod-kpi-val', text: String(k[1]) }),
            el('div', { class: 'cso-mod-kpi-lbl', text: k[0] })
          ]));
        });

        renderPills();
        drawTable();
      } catch (e) {
        clear(tableHost);
        tableHost.appendChild(el('p', { class: 'cso-mod-muted', text: 'Failed to load pages: ' + e.message }));
      }
    }

    searchInp.addEventListener('input', function () { state.q = searchInp.value; state.page = 0; drawTable(); });
    pageSizeSel.addEventListener('change', function () { state.pageSize = pageSizeSel.value; state.page = 0; drawTable(); });

    renderBanner(shell, 'All Website Pages', 'Live merged inventory of all static portals + D1 live overrides + custom pages with bulk controls & split-pane previews.', [
      el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-primary', text: '+ Create New Page', onclick: function () { window.selectModule && window.selectModule('folder-02', 'module-02-002'); } }),
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'Bulk Publish Live', onclick: function () { bulkSetStatus('published'); } }),
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'Bulk Set Draft', onclick: function () { bulkSetStatus('draft'); } }),
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'Export JSON', onclick: exportPagesJson }),
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'Export CSV', onclick: exportPagesCsv }),
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'Refresh', onclick: loadPages })
    ]);

    shell.appendChild(kpiHost);
    shell.appendChild(el('div', { class: 'cso-mod-card' }, [
      el('div', { class: 'cso-mod-grid-2' }, [searchInp, pageSizeSel]),
      catRow,
      statusRow
    ]));
    shell.appendChild(drawerHost);
    shell.appendChild(tableHost);
    root.appendChild(shell);
    loadPages();
  }

  /* -------------------------------------------------------------------------
     02-002: Create New Page (Live POST /api/admin/pages + Google Snippet)
     ------------------------------------------------------------------------- */
  function renderCreatePageWizard(root, actions) {
    addHeaderPill(actions, '● Live Page Publisher');
    var tpl = f02State.createTemplate;
    f02State.createTemplate = null;

    var BLUEPRINTS = {
      blank: {
        title: '', slug: '/new-page/', category: 'Core Portal',
        meta: '', heroTitle: '', heroSub: '', ctaLabel: 'Explore Portal', ctaUrl: '/jobs-careers/',
        blocks: [{ type: 'richtext', title: 'Overview', text: 'Add page overview and candidate guidance here.' }]
      },
      exam: {
        title: 'OPSC & OSSC Exam Guide 2026 | CS Odisha', slug: '/opsc-ossc-exam-guide-2026/', category: 'Exam Guide',
        meta: 'Complete OPSC OAS & OSSC CGL 2026 exam guide: eligibility, syllabus, exam pattern, key dates, and free CBT mock tests on Common Sense Odisha.',
        heroTitle: 'OPSC & OSSC Combined Exam Guide 2026', heroSub: 'Syllabus, exam pattern, key dates & free Odisha CBT practice tests.',
        ctaLabel: 'Start Free Mock Test', ctaUrl: '/mock-tests/',
        blocks: [
          { type: 'notice', title: 'Official Exam Window', text: 'Verify final notification dates on opsc.gov.in and ossc.gov.in.' },
          { type: 'key_dates', title: 'Tentative Exam Schedule 2026', text: 'Notification: Jan 2026 | Prelims: May 2026 | Mains: Sep 2026' },
          { type: 'faq', title: 'Who can apply for OPSC & OSSC?', text: 'Graduates aged 21–38 years (with Odisha govt age relaxations).' },
          { type: 'official_links', title: 'Official Commission Portals', text: 'OPSC: https://opsc.gov.in | OSSC: https://ossc.gov.in' }
        ]
      },
      scheme: {
        title: 'Odisha Govt Welfare & Student Schemes 2026', slug: '/odisha-govt-schemes-2026/', category: 'Core Portal',
        meta: 'Updated directory of Odisha State Government scholarships, youth skill schemes, eligibility criteria, and official online application links.',
        heroTitle: 'Odisha State Schemes & Scholarships', heroSub: 'Verified eligibility rules, documents checklist & official portal links.',
        ctaLabel: 'Browse All Resources', ctaUrl: '/resources/',
        blocks: [
          { type: 'richtext', title: 'Eligibility & Documents Required', text: 'Aadhaar, Residence Certificate, Income Certificate, and Bank Passbook.' },
          { type: 'key_dates', title: 'Application Deadlines', text: 'Fresh Registration: Open | Renewal Window: Closing Soon' },
          { type: 'official_links', title: 'State Scholarship Portal', text: 'https://scholarship.odisha.gov.in' }
        ]
      },
      policy: {
        title: 'Editorial Policy & Verification Standards', slug: '/editorial-verification-policy/', category: 'Information & Legal',
        meta: 'How Common Sense Odisha verifies OPSC, OSSC, and OSSSC recruitment notifications, answer keys, and syllabus updates for Odisha aspirants.',
        heroTitle: 'Editorial & Verification Policy', heroSub: 'Our 3-step official gazette verification workflow for Odisha job alerts.',
        ctaLabel: 'Contact Editorial Desk', ctaUrl: '/contact/',
        blocks: [
          { type: 'richtext', title: 'Primary Source Verification', text: 'Every alert is cross-checked against official Odisha commission PDFs before publishing.' },
          { type: 'faq', title: 'How do I report a correction?', text: 'Reach out via the Contact page with the official notice reference number.' }
        ]
      }
    };

    var shell = el('div', { class: 'cso-mod-shell' });
    var kpiHost = el('div', { class: 'cso-mod-kpis' });
    var resultBanner = el('div', {});
    var existingRoutes = {};
    var previewTab = 'page';
    var mobileMode = false;

    var titleInp = el('input', { type: 'text', class: 'cso-mod-input', placeholder: 'e.g. OPSC OAS 2026 Complete Guide', value: tpl ? tpl.name : '' });
    var slugInp = el('input', { type: 'text', class: 'cso-mod-input', placeholder: '/opsc-oas-2026/', value: tpl ? '/' + tpl.id + '/' : '' });
    var catSel = el('select', { class: 'cso-mod-select' }, [
      'Core Portal', 'Candidate Workspace', 'Information & Legal', 'Exam Guide', 'Recruitment'
    ].map(function (c) { return el('option', { value: c, text: c, selected: tpl && tpl.category === c }); }));
    var metaDescInp = el('textarea', { class: 'cso-mod-textarea', placeholder: 'Concise 145–160 char search snippet for Google…' });
    metaDescInp.value = tpl ? (tpl.meta_description || '') : '';

    var heroTitleInp = el('input', { type: 'text', class: 'cso-mod-input', placeholder: 'Hero H1 headline', value: tpl ? (tpl.hero_title || '') : '' });
    var heroSubInp = el('input', { type: 'text', class: 'cso-mod-input', placeholder: 'Hero supporting subtitle', value: tpl ? (tpl.hero_subtitle || '') : '' });
    var odiaSubInp = el('input', { type: 'text', class: 'cso-mod-input', placeholder: 'ଓଡ଼ିଆ ଉପଶୀର୍ଷକ (Optional Odia subtitle / tag)' });
    var ctaLblInp = el('input', { type: 'text', class: 'cso-mod-input', placeholder: 'e.g. Apply Online', value: tpl ? (tpl.cta_label || '') : '' });
    var ctaUrlInp = el('input', { type: 'text', class: 'cso-mod-input', placeholder: '/jobs-careers/', value: tpl ? (tpl.cta_url || '') : '' });
    var ogImgInp = el('input', { type: 'text', class: 'cso-mod-input', placeholder: '/api/media/<key>.jpg or https://…' });
    var layoutSel = el('select', { class: 'cso-mod-select' }, [
      'Standard Portal', 'Landing Page (Full Width)', 'Notification / Document View'
    ].map(function (v) { return el('option', { value: v, text: v }); }));
    var navChk = el('input', { type: 'checkbox' });
    var featChk = el('input', { type: 'checkbox' });
    var noindexChk = el('input', { type: 'checkbox' });
    var schedInp = el('input', { type: 'datetime-local', class: 'cso-mod-input' });
    var expiresInp = el('input', { type: 'date', class: 'cso-mod-input' });

    var starterBlocks = tpl ? JSON.parse(JSON.stringify(tpl.blocks || [])) : [
      { type: 'hero', title: 'New Odisha Exam Portal', text: 'Verified syllabus, official links, and live alerts.', label: 'Explore Jobs', url: '/jobs-careers/' },
      { type: 'notice', title: 'Important Notice', text: 'Always verify final dates on the official commission portal.' }
    ];
    var attachments = [];
    var r2Open = false;
    var r2Filter = 'All';
    var r2Items = [];
    var activeEmbedId = null;
    var allPagesList = [];
    var verifiedRoutes = [];
    var draftTimer = null;
    var DRAFT_KEY = 'cso_new_page_draft';
    var recoveryHost = el('div', {});
    var validationHost = el('div', {});
    var publishBtn = el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-primary', text: 'Publish Live Now', onclick: function () { submitPage('published'); } });

    function utf8Bytes(s) {
      try { return new TextEncoder().encode(String(s || '')).length; } catch (_) { return String(s || '').length; }
    }

    var blocksHost = el('div', { class: 'cso-mod-shell' });
    var attachListHost = el('div', { class: 'cso-mod-shell' });
    var attachPreviewHost = el('div', {});
    var r2LibraryHost = el('div', { class: 'cso-mod-card cso-hidden' });
    var titleCount = el('div', { class: 'cso-char-count' });
    var descCount = el('div', { class: 'cso-char-count' });
    var slugStatusEl = el('div', { class: 'cso-mod-toolbar' });
    var previewHost = el('div', {});

    function detectLinkMeta(rawUrl, linkType) {
      var u = String(rawUrl || '').trim();
      var domain = '';
      var previewUrl = u;
      var sourceKind = 'external';
      var sourceLabel = linkType || 'Reference Link';
      var isImage = /\.(png|jpe?g|webp|svg|gif)(\?|$)/i.test(u);
      var isPdf = /\.pdf(\?|$)/i.test(u);
      if (u.indexOf('/api/media/') === 0) {
        domain = 'csodisha.com (R2)';
        sourceKind = 'r2';
        sourceLabel = isImage ? 'R2 Photo' : (isPdf ? 'R2 PDF' : 'R2 File');
      } else {
        try {
          var parsed = new URL(u, window.location.origin);
          domain = parsed.hostname;
          if (/drive\.google\.com/i.test(domain)) {
            sourceKind = 'gdrive';
            sourceLabel = 'Google Drive';
            var m = u.match(/\/file\/d\/([^\/?#]+)/) || u.match(/[?&]id=([^&]+)/);
            if (m && m[1]) previewUrl = 'https://drive.google.com/file/d/' + m[1] + '/preview';
          } else if (/\.(gov|nic)\.in$/i.test(domain)) {
            sourceKind = 'gov';
            sourceLabel = 'Official Portal';
          } else if (isPdf) {
            sourceKind = 'pdf';
            sourceLabel = 'Direct PDF';
          }
        } catch (_) {}
      }
      return { domain: domain, preview_url: previewUrl, source_kind: sourceKind, source_label: sourceLabel, is_image: isImage, is_pdf: isPdf };
    }

    function addAttachment(item) {
      attachments.push(item);
      if (!ogImgInp.value.trim() && item.is_image) ogImgInp.value = item.url;
      renderAttachments();
      updateAll();
    }

    function openInlineAttachPreview(att) {
      clear(attachPreviewHost);
      var box = el('div', { class: 'cso-drawer' }, [
        el('div', { class: 'cso-drawer-head' }, [
          el('strong', { text: 'Attachment Preview: ' + att.title }),
          el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Close', onclick: function () { clear(attachPreviewHost); } })
        ])
      ]);
      if (att.is_image) {
        box.appendChild(el('img', { src: att.url, alt: att.title, class: 'cso-asset-preview-img' }));
      } else if (att.is_pdf || att.source_kind === 'gdrive') {
        box.appendChild(el('iframe', { src: att.preview_url || att.url, class: 'cso-asset-preview-pdf', title: att.title }));
      } else {
        box.appendChild(el('p', { class: 'cso-mod-muted', text: att.source_label + ' · ' + att.url }));
      }
      attachPreviewHost.appendChild(box);
    }

    function renderAttachments() {
      clear(attachListHost);
      if (!attachments.length) {
        attachListHost.appendChild(el('p', { class: 'cso-mod-muted', text: 'No R2 files, photos, or official/Google Drive links attached yet.' }));
        return;
      }
      var ROLES = ['Hero Cover Image', 'OpenGraph Social Image', 'Official Portal Link', 'Google Drive Document', 'Downloadable PDF/File', 'Inline Photo', 'Apply Online CTA'];
      attachments.forEach(function (att, idx) {
        var tInp = el('input', { type: 'text', class: 'cso-mod-input', value: att.title });
        tInp.addEventListener('input', function () { att.title = tInp.value; updatePreviewPane(); });
        var roleSel = el('select', { class: 'cso-mod-select' }, ROLES.map(function (r) {
          return el('option', { value: r, text: r, selected: att.role === r });
        }));
        roleSel.addEventListener('change', function () {
          att.role = roleSel.value;
          if (att.role === 'OpenGraph Social Image' && att.is_image) ogImgInp.value = att.url;
          updatePreviewPane();
        });
        var ntChk = el('input', { type: 'checkbox', checked: att.new_tab !== false });
        ntChk.addEventListener('change', function () { att.new_tab = !!ntChk.checked; });
        var altInp = att.is_image ? el('input', { type: 'text', class: 'cso-mod-input', value: att.alt || '', placeholder: 'Image alt text (required for SEO/accessibility)' }) : null;
        if (altInp) altInp.addEventListener('input', function () { att.alt = altInp.value; updateAll(); });

        attachListHost.appendChild(el('div', { class: 'cso-builder-block' }, [
          el('div', { class: 'cso-builder-block-head' }, [
            el('div', { class: 'cso-inline-row' }, [
              badge(att.source_label || 'Link', att.source_kind === 'gov' || att.source_kind === 'r2' ? 'ok' : 'info'),
              el('span', { class: 'cso-mod-muted', text: att.domain || att.url })
            ]),
            el('div', { class: 'cso-mod-toolbar' }, [
              el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: '↑', disabled: idx === 0, onclick: function () { var tmp = attachments[idx - 1]; attachments[idx - 1] = att; attachments[idx] = tmp; renderAttachments(); updatePreviewPane(); } }),
              el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: '↓', disabled: idx === attachments.length - 1, onclick: function () { var tmp = attachments[idx + 1]; attachments[idx + 1] = att; attachments[idx] = tmp; renderAttachments(); updatePreviewPane(); } }),
              el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Preview', onclick: function () { openInlineAttachPreview(att); } }),
              el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-danger cso-mod-btn-sm', text: 'Remove', onclick: function () { attachments.splice(idx, 1); renderAttachments(); updateAll(); } })
            ])
          ]),
          el('div', { class: 'cso-mod-grid-3' }, [
            tInp,
            roleSel,
            el('label', { class: 'cso-check-label' }, [ntChk, el('span', { text: 'Open in New Tab' })])
          ]),
          altInp ? el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Image Alt Text' }), altInp]) : null
        ]));
      });
    }

    async function toggleR2Browser(forceOpen) {
      r2Open = forceOpen !== undefined ? forceOpen : !r2Open;
      r2LibraryHost.classList.toggle('cso-hidden', !r2Open);
      if (!r2Open) return;
      clear(r2LibraryHost);
      r2LibraryHost.appendChild(el('p', { class: 'cso-mod-muted', text: 'Loading R2 media library…' }));
      try {
        var res = await api('GET', 'media?limit=60');
        r2Items = res.items || [];
        drawR2Browser();
      } catch (e) { fail(r2LibraryHost, e); }
    }

    function drawR2Browser() {
      clear(r2LibraryHost);
      var qInp = el('input', { type: 'search', class: 'cso-mod-input', placeholder: 'Filter R2 files by name or key…' });
      var listBox = el('div', { class: 'cso-mod-shell' });
      function drawList() {
        clear(listBox);
        var q = qInp.value.toLowerCase().trim();
        var shown = r2Items.filter(function (m) {
          var k = (m.kind || '').toLowerCase();
          var typeOk = r2Filter === 'All' ||
            (r2Filter === 'Images' && k === 'image') ||
            (r2Filter === 'PDFs' && k === 'pdf') ||
            (r2Filter === 'Docs/Archives' && k !== 'image' && k !== 'pdf');
          var textOk = !q || ((m.original_name || '') + ' ' + (m.object_key || '')).toLowerCase().indexOf(q) >= 0;
          return typeOk && textOk;
        });
        if (!shown.length) {
          listBox.appendChild(el('p', { class: 'cso-mod-muted', text: 'No matching R2 assets found.' }));
          return;
        }
        shown.slice(0, 20).forEach(function (m) {
          var url = m.url || ('/api/media/' + m.object_key);
          var isImg = m.kind === 'image';
          var isPdf = m.kind === 'pdf';
          listBox.appendChild(el('div', { class: 'cso-drawer-head' }, [
            el('div', {}, [
              el('strong', { text: m.original_name || m.object_key }),
              el('div', { class: 'cso-mod-muted', text: (m.mime_type || m.kind) + ' · ' + Math.round((m.size_bytes || 0) / 1024) + ' KB' })
            ]),
            el('div', { class: 'cso-mod-toolbar' }, [
              el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm cso-mod-btn-primary', text: 'Attach', onclick: function () {
                addAttachment({
                  id: 'att-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
                  title: m.original_name || m.object_key,
                  url: url, preview_url: url,
                  role: isImg ? 'Hero Cover Image' : 'Downloadable PDF/File',
                  source_kind: 'r2', source_label: isImg ? 'R2 Photo' : (isPdf ? 'R2 PDF' : 'R2 File'),
                  domain: 'csodisha.com (R2)', is_image: isImg, is_pdf: isPdf, new_tab: true
                });
                toast('Attached R2 asset: ' + (m.original_name || m.object_key), 'success');
              } }),
              isImg ? el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Set OG Image', onclick: function () {
                ogImgInp.value = url;
                updatePreviewPane();
                toast('OG image set!', 'success');
              } }) : null
            ])
          ]));
        });
      }
      qInp.addEventListener('input', drawList);
      r2LibraryHost.appendChild(el('div', { class: 'cso-drawer-head' }, [
        el('strong', { text: 'R2 Media Library (' + r2Items.length + ' assets)' }),
        el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Close', onclick: function () { toggleR2Browser(false); } })
      ]));
      r2LibraryHost.appendChild(pills(['All', 'Images', 'PDFs', 'Docs/Archives'], function (f) { r2Filter = f; drawList(); }));
      r2LibraryHost.appendChild(qInp);
      r2LibraryHost.appendChild(listBox);
      drawList();
    }

    function applyBlueprint(key) {
      var bp = BLUEPRINTS[key];
      if (!bp) return;
      titleInp.value = bp.title;
      slugInp.value = bp.slug;
      delete slugInp.dataset.touched;
      catSel.value = bp.category;
      metaDescInp.value = bp.meta;
      heroTitleInp.value = bp.heroTitle;
      delete heroTitleInp.dataset.touched;
      heroSubInp.value = bp.heroSub;
      ctaLblInp.value = bp.ctaLabel;
      ctaUrlInp.value = bp.ctaUrl;
      starterBlocks = JSON.parse(JSON.stringify(bp.blocks));
      renderInitialBlocks();
      updateAll();
      toast('Applied blueprint: ' + key, 'info');
    }

    function renderReadinessKpis() {
      clear(kpiHost);
      var tl = titleInp.value.trim().length;
      var dl = metaDescInp.value.trim().length;
      var route = f02NormalizeRoute(slugInp.value || '/new-page/');
      var taken = !!existingRoutes[route];
      [
        { l: 'SEO Title Score', v: tl + ' chars', s: tl >= 50 && tl <= 60 ? 'Optimal (50–60) ✓' : tl >= 20 && tl <= 70 ? 'Acceptable' : 'Aim for 50–60 chars' },
        { l: 'Meta Description Score', v: dl + ' chars', s: dl >= 145 && dl <= 160 ? 'Optimal (145–160) ✓' : dl >= 70 && dl <= 170 ? 'Acceptable' : 'Aim for 145–160 chars' },
        { l: 'Route Availability', v: taken ? 'Exists' : 'Available ✓', s: route },
        { l: 'Block Count', v: String(starterBlocks.length), s: 'Structured content blocks' }
      ].forEach(function (k) {
        kpiHost.appendChild(el('div', { class: 'cso-mod-kpi' }, [
          el('div', { class: 'cso-mod-kpi-label', text: k.l }),
          el('div', { class: 'cso-mod-kpi-val', text: k.v }),
          el('div', { class: 'cso-mod-kpi-sub', text: k.s })
        ]));
      });
    }

    function buildPreviewJsonLd(r, t) {
      var list = [
        { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://csodisha.com/' },
          { '@type': 'ListItem', position: 2, name: t, item: 'https://csodisha.com' + r }
        ] }
      ];
      var faqEnt = starterBlocks.filter(function (b) { return b.type === 'faq' && (b.question || b.title) && (b.answer || b.text); }).map(function (b) {
        return { '@type': 'Question', name: b.question || b.title, acceptedAnswer: { '@type': 'Answer', text: b.answer || b.text } };
      });
      if (faqEnt.length) list.push({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqEnt });
      return list;
    }

    function updatePreviewPane() {
      clear(previewHost);
      var t = titleInp.value.trim() || 'Page Title — Common Sense Odisha';
      var d = metaDescInp.value.trim() || 'Meta description preview will appear here as you type…';
      var r = f02NormalizeRoute(slugInp.value || '/new-page/');
      var hTitle = heroTitleInp.value.trim() || t;
      var hSub = heroSubInp.value.trim() || 'Supporting summary for Odisha aspirants.';
      var oSub = odiaSubInp.value.trim();
      var cLbl = ctaLblInp.value.trim();
      var heroImgAtt = attachments.find(function (a) { return a.is_image && a.role === 'Hero Cover Image'; });
      var ogAtt = attachments.find(function (a) { return a.is_image && a.role === 'OpenGraph Social Image'; });
      var ogUrl = ogImgInp.value.trim() || (ogAtt ? ogAtt.url : (heroImgAtt ? heroImgAtt.url : ''));

      var card = el('div', { class: mobileMode ? 'cso-preview-card-mobile' : 'cso-preview-card-desktop' });
      if (previewTab === 'serp') {
        card.appendChild(el('div', { class: 'cso-serp-card' }, [
          el('div', { class: 'cso-serp-url', text: 'https://csodisha.com' + r }),
          el('div', { class: 'cso-serp-title', text: t }),
          el('p', { class: 'cso-serp-desc', text: d })
        ]));
      } else if (previewTab === 'og') {
        var ogCard = el('div', { class: 'cso-og-card' }, [
          el('div', { class: 'cso-preview-kicker', text: 'CSODISHA.COM · ' + catSel.value.toUpperCase() }),
          ogUrl ? el('img', { src: ogUrl, alt: t, class: 'cso-asset-preview-img' }) : null,
          el('strong', { text: t }),
          el('p', { class: 'cso-mod-muted', text: d })
        ]);
        card.appendChild(ogCard);
      } else if (previewTab === 'jsonld') {
        card.appendChild(el('pre', { class: 'cso-code-pre', text: JSON.stringify(buildPreviewJsonLd(r, t), null, 2) }));
      } else {
        card.appendChild(el('div', { class: 'cso-drawer-head' }, [
          el('strong', { text: 'Common Sense Odisha' }),
          el('div', { class: 'cso-mod-muted', text: layoutSel.value + ' · Jobs · Current Affairs · Mock Tests' })
        ]));
        card.appendChild(el('div', { class: 'cso-og-card' }, [
          el('div', { class: 'cso-preview-kicker', text: catSel.value.toUpperCase() + ' · PREVIEW (UNPUBLISHED)' }),
          heroImgAtt ? el('img', { src: heroImgAtt.url, alt: heroImgAtt.alt || heroImgAtt.title, class: 'cso-asset-preview-img' }) : null,
          el('h3', { text: hTitle }),
          el('p', { class: 'cso-preview-body', text: hSub }),
          oSub ? el('p', { class: 'cso-mod-muted', text: oSub }) : null,
          cLbl ? el('span', { class: 'cso-mod-btn cso-mod-btn-sm cso-mod-btn-primary', text: cLbl }) : null
        ]));
        starterBlocks.forEach(function (b, idx) {
          var blk = el('div', { class: 'cso-builder-block' }, [
            el('div', { class: 'cso-builder-block-head' }, [badge((idx + 1) + '. ' + b.type, 'info')]),
            el('strong', { text: b.question || b.title || b.heading || '(Untitled Block)' }),
            el('p', { class: 'cso-mod-muted', text: b.answer || b.text || b.body || '' }),
            (b.url && b.type === 'image') ? el('img', { src: b.url, alt: b.alt || b.title || '', class: 'cso-asset-preview-img' }) : null
          ]);
          if (b.type === 'key_dates' && Array.isArray(b.rows) && b.rows.length) {
            blk.appendChild(safeTable(['Event / Milestone', 'Date / Status'], b.rows.map(function (rw) {
              return el('tr', {}, [el('td', { text: rw.label || '' }), el('td', { text: rw.value || '' })]);
            })));
          }
          card.appendChild(blk);
        });
        attachments.forEach(function (att) {
          if (att.role === 'Hero Cover Image' || att.role === 'OpenGraph Social Image') return;
          if (att.role === 'Inline Photo' && att.is_image) {
            card.appendChild(el('div', { class: 'cso-builder-block' }, [
              el('strong', { text: att.title }),
              el('img', { src: att.url, alt: att.alt || att.title, class: 'cso-asset-preview-img' })
            ]));
            return;
          }
          var embedOpen = activeEmbedId === att.id;
          var attCard = el('div', { class: 'cso-builder-block' }, [
            el('div', { class: 'cso-builder-block-head' }, [
              el('div', { class: 'cso-inline-row' }, [
                badge(att.source_label || att.role, att.source_kind === 'gov' || att.source_kind === 'r2' ? 'ok' : 'info'),
                el('strong', { text: att.title }),
                el('span', { class: 'cso-mod-muted', text: att.domain || '' })
              ]),
              el('div', { class: 'cso-mod-toolbar' }, [
                (att.is_pdf || att.source_kind === 'gdrive' || att.is_image) ? el('button', {
                  type: 'button',
                  class: 'cso-mod-btn cso-mod-btn-sm',
                  text: embedOpen ? 'Hide Embed' : 'Preview File / Drive Embed',
                  onclick: function () { activeEmbedId = embedOpen ? null : att.id; updatePreviewPane(); }
                }) : null,
                el('span', { class: 'cso-mod-btn cso-mod-btn-sm cso-mod-btn-primary', text: att.role === 'Apply Online CTA' ? 'Apply Online ↗' : 'Open ↗' })
              ])
            ])
          ]);
          if (embedOpen) {
            attCard.appendChild(att.is_image
              ? el('img', { src: att.url, alt: att.alt || att.title, class: 'cso-asset-preview-img' })
              : el('iframe', { src: att.preview_url || att.url, class: 'cso-asset-preview-pdf', title: att.title }));
          }
          card.appendChild(attCard);
        });
      }
      previewHost.appendChild(card);
    }

    function runValidation() {
      var errs = [], warns = [];
      var t = titleInp.value.trim();
      var d = metaDescInp.value.trim();
      var rawSlug = slugInp.value.trim();
      var r = f02NormalizeRoute(rawSlug || '/new-page/');
      if (!t || t.length < 6) errs.push({ msg: 'Page Title is missing or too short (min 6 chars)', el: titleInp });
      if (!rawSlug || rawSlug === '/' || !/^\/[a-z0-9\-\/]+$/i.test(rawSlug)) errs.push({ msg: 'Slug must be a valid /kebab-case/ route', el: slugInp });
      if (existingRoutes[r]) errs.push({ msg: 'Route ' + r + ' already exists in /api/admin/pages', el: slugInp });
      if (d.length < 120 || d.length > 160) warns.push({ msg: 'Meta Description (' + d.length + ' chars) should be 120–160 chars', el: metaDescInp });
      if (utf8Bytes(d) > 160) warns.push({ msg: 'Meta Description exceeds 160 UTF-8 bytes (' + utf8Bytes(d) + 'B) — Odia text may truncate', el: metaDescInp });
      var ctaU = ctaUrlInp.value.trim();
      if (ctaU && ctaU.indexOf('http://') === 0) warns.push({ msg: 'CTA URL uses non-HTTPS http://', el: ctaUrlInp });
      if (ctaU && ctaU.indexOf('/') !== 0 && !/^https?:\/\//i.test(ctaU)) errs.push({ msg: 'CTA URL is malformed', el: ctaUrlInp });
      attachments.forEach(function (att) {
        if (att.url && att.url.indexOf('http://') === 0) warns.push({ msg: 'Attachment "' + att.title + '" uses non-HTTPS http://', el: attachListHost });
        if (att.is_image && (att.role === 'Hero Cover Image' || att.role === 'Inline Photo') && !(att.alt || '').trim()) {
          errs.push({ msg: 'Missing image alt text on "' + att.title + '"', el: attachListHost });
        }
        if (att.source_kind === 'gdrive' && !/drive\.google\.com\/(file\/d\/|drive\/folders\/|open\?id=)/i.test(att.url)) {
          errs.push({ msg: 'Invalid Google Drive URL on "' + att.title + '"', el: attachListHost });
        }
      });
      starterBlocks.forEach(function (b, idx) {
        var hasContent = (b.title || b.heading || '').trim() || (b.text || b.body || '').trim() || (b.question || '').trim() || (Array.isArray(b.rows) && b.rows.length);
        if (!hasContent) warns.push({ msg: 'Block #' + (idx + 1) + ' (' + b.type + ') is empty', el: blocksHost });
        if (b.type === 'key_dates' && Array.isArray(b.rows) && b.rows.length === 0) {
          errs.push({ msg: 'Key Dates Table #' + (idx + 1) + ' has 0 rows', el: blocksHost });
        }
      });
      if (schedInp.value && Date.parse(schedInp.value) < Date.now()) {
        errs.push({ msg: 'Schedule Date/Time is in the past', el: schedInp });
      }
      if (expiresInp.value && schedInp.value && Date.parse(expiresInp.value) < Date.parse(schedInp.value)) {
        errs.push({ msg: 'Expiry Date is earlier than Schedule Date', el: expiresInp });
      }

      publishBtn.disabled = errs.length > 0;
      clear(validationHost);
      if (!errs.length && !warns.length) {
        validationHost.appendChild(el('div', { class: 'cso-mod-card' }, [badge('Pre-Publish Gate: All Checks Passed ✓', 'ok')]));
        return;
      }
      var list = el('div', { class: 'cso-mod-toolbar' });
      errs.forEach(function (er) {
        list.appendChild(el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-danger cso-mod-btn-sm', text: '⛔ ' + er.msg, onclick: function () { if (er.el && er.el.focus) er.el.focus(); if (er.el && er.el.scrollIntoView) er.el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } }));
      });
      warns.forEach(function (w) {
        list.appendChild(el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: '⚠ ' + w.msg, onclick: function () { if (w.el && w.el.focus) w.el.focus(); if (w.el && w.el.scrollIntoView) w.el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } }));
      });
      validationHost.appendChild(el('div', { class: 'cso-drawer' }, [
        el('div', { class: 'cso-drawer-head' }, [
          el('strong', { text: 'Pre-Publish Error Detector (' + errs.length + ' blocking, ' + warns.length + ' warnings)' }),
          el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm cso-mod-btn-primary', text: '1-Click Auto-Fix Safe Issues', onclick: autoFixSafe })
        ]),
        list
      ]));
    }

    function autoFixSafe() {
      titleInp.value = titleInp.value.trim();
      metaDescInp.value = metaDescInp.value.trim();
      var cleanSlug = slugInp.value.trim().toLowerCase().replace(/[^a-z0-9\/-]+/g, '-').replace(/-+/g, '-');
      if (cleanSlug) slugInp.value = f02NormalizeRoute(cleanSlug);
      if (ctaUrlInp.value.trim().indexOf('http://') === 0) ctaUrlInp.value = ctaUrlInp.value.trim().replace(/^http:\/\//i, 'https://');
      attachments.forEach(function (att) {
        if (att.url && att.url.indexOf('http://') === 0) att.url = att.url.replace(/^http:\/\//i, 'https://');
        if (att.is_image && !(att.alt || '').trim()) att.alt = (att.title || 'Odisha Exam Portal Image').replace(/\.[a-z0-9]+$/i, '');
      });
      starterBlocks.forEach(function (b) {
        if (b.type === 'key_dates' && Array.isArray(b.rows)) {
          b.rows = b.rows.filter(function (rw) { return (rw.label || '').trim() || (rw.value || '').trim(); });
        }
      });
      renderAttachments();
      renderInitialBlocks();
      updateAll();
      toast('Applied safe auto-fixes!', 'success');
    }

    function scheduleDraftSave() {
      if (draftTimer) clearTimeout(draftTimer);
      draftTimer = setTimeout(function () {
        try {
          if (!titleInp.value.trim() && !metaDescInp.value.trim()) return;
          localStorage.setItem(DRAFT_KEY, JSON.stringify({
            title: titleInp.value, slug: slugInp.value, category: catSel.value,
            meta: metaDescInp.value, heroTitle: heroTitleInp.value, heroSub: heroSubInp.value,
            odiaSub: odiaSubInp.value, ctaLabel: ctaLblInp.value, ctaUrl: ctaUrlInp.value,
            ogImg: ogImgInp.value, layout: layoutSel.value, showNav: navChk.checked,
            featureHome: featChk.checked, noindex: noindexChk.checked, expiresAt: expiresInp.value,
            blocks: starterBlocks, attachments: attachments, savedAt: new Date().toISOString()
          }));
        } catch (_) {}
      }, 600);
    }

    function updateAll() {
      var t = titleInp.value.trim();
      var d = metaDescInp.value.trim();
      var r = f02NormalizeRoute(slugInp.value || '/new-page/');
      titleCount.textContent = t.length + ' / 60 chars (' + utf8Bytes(t) + ' UTF-8 bytes)';
      titleCount.className = 'cso-char-count' + (t.length > 60 ? ' is-over' : '');
      descCount.textContent = d.length + ' / 160 chars (' + utf8Bytes(d) + ' UTF-8 bytes)';
      descCount.className = 'cso-char-count' + (d.length > 160 ? ' is-over' : '');
      clear(slugStatusEl);
      if (existingRoutes[r]) {
        slugStatusEl.appendChild(badge('Already Exists (will update)', 'warn'));
      } else {
        slugStatusEl.appendChild(badge('Slug Available ✓', 'ok'));
      }
      slugStatusEl.appendChild(el('code', { text: r }));
      renderReadinessKpis();
      runValidation();
      updatePreviewPane();
      scheduleDraftSave();
    }

    function renderInitialBlocks() {
      clear(blocksHost);
      starterBlocks.forEach(function (b, idx) {
        var bTitle = el('input', { type: 'text', class: 'cso-mod-input', value: b.title || b.heading || '', placeholder: b.type === 'faq' ? 'FAQ Question' : 'Block Title' });
        var bText = el('input', { type: 'text', class: 'cso-mod-input', value: b.text || b.body || '', placeholder: b.type === 'faq' ? 'FAQ Answer' : 'Block Text' });
        bTitle.addEventListener('input', function () { b.title = bTitle.value; if (b.type === 'faq') b.question = bTitle.value; updateAll(); });
        bText.addEventListener('input', function () { b.text = bText.value; if (b.type === 'faq') b.answer = bText.value; updateAll(); });

        var extraNode = null;
        if (b.type === 'key_dates') {
          if (!Array.isArray(b.rows)) b.rows = [];
          var pasteTa = el('textarea', { class: 'cso-mod-textarea', rows: '2', placeholder: 'Paste lines like "Last Date: 30 Nov 2026" and click Auto-Split…' });
          var rowsWrap = el('div', { class: 'cso-mod-shell' });
          b.rows.forEach(function (rw, rIdx) {
            var lInp = el('input', { type: 'text', class: 'cso-mod-input', value: rw.label || '', placeholder: 'Label' });
            var vInp = el('input', { type: 'text', class: 'cso-mod-input', value: rw.value || '', placeholder: 'Value' });
            lInp.addEventListener('input', function () { rw.label = lInp.value; updateAll(); });
            vInp.addEventListener('input', function () { rw.value = vInp.value; updateAll(); });
            rowsWrap.appendChild(el('div', { class: 'cso-mod-grid-3' }, [
              lInp, vInp,
              el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-danger cso-mod-btn-sm', text: '×', onclick: function () { b.rows.splice(rIdx, 1); renderInitialBlocks(); updateAll(); } })
            ]));
          });
          extraNode = el('div', { class: 'cso-mod-shell' }, [
            el('div', { class: 'cso-mod-toolbar' }, [
              pasteTa,
              el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Paste Lines & Auto-Split', onclick: function () {
                var lines = pasteTa.value.split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean);
                lines.forEach(function (ln) {
                  var parts = ln.split(/[:|\t–—]+/);
                  if (parts.length >= 2) b.rows.push({ label: parts[0].trim(), value: parts.slice(1).join(':').trim() });
                  else b.rows.push({ label: ln, value: 'TBD' });
                });
                pasteTa.value = '';
                renderInitialBlocks(); updateAll();
              } }),
              el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: '+ Add Row', onclick: function () { b.rows.push({ label: '', value: '' }); renderInitialBlocks(); updateAll(); } })
            ]),
            rowsWrap
          ]);
        }

        blocksHost.appendChild(el('div', { class: 'cso-builder-block' }, [
          el('div', { class: 'cso-builder-block-head' }, [
            badge((idx + 1) + '. ' + b.type, 'info'),
            el('div', { class: 'cso-mod-toolbar' }, [
              el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: '↑', disabled: idx === 0, onclick: function () { var tmp = starterBlocks[idx - 1]; starterBlocks[idx - 1] = b; starterBlocks[idx] = tmp; renderInitialBlocks(); updateAll(); } }),
              el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: '↓', disabled: idx === starterBlocks.length - 1, onclick: function () { var tmp = starterBlocks[idx + 1]; starterBlocks[idx + 1] = b; starterBlocks[idx] = tmp; renderInitialBlocks(); updateAll(); } }),
              el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Duplicate', onclick: function () { starterBlocks.splice(idx + 1, 0, JSON.parse(JSON.stringify(b))); renderInitialBlocks(); updateAll(); } }),
              el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-danger cso-mod-btn-sm', text: 'Remove', onclick: function () { starterBlocks.splice(idx, 1); renderInitialBlocks(); updateAll(); } })
            ])
          ]),
          el('div', { class: 'cso-mod-grid-2' }, [bTitle, bText]),
          extraNode
        ]));
      });
    }

    titleInp.addEventListener('input', function () {
      if (!slugInp.dataset.touched) {
        var s = titleInp.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        slugInp.value = '/' + (s || 'new-page') + '/';
      }
      if (!heroTitleInp.dataset.touched && !tpl) heroTitleInp.value = titleInp.value;
      updateAll();
    });
    slugInp.addEventListener('input', function () { slugInp.dataset.touched = '1'; updateAll(); });
    heroTitleInp.addEventListener('input', function () { heroTitleInp.dataset.touched = '1'; updateAll(); });
    [metaDescInp, heroSubInp, odiaSubInp, ctaLblInp, ctaUrlInp, ogImgInp, catSel, layoutSel, navChk, featChk, noindexChk, schedInp, expiresInp].forEach(function (inp) {
      inp.addEventListener('input', updateAll);
      inp.addEventListener('change', updateAll);
    });

    async function submitPage(status) {
      var route = f02NormalizeRoute(slugInp.value);
      if (!titleInp.value.trim()) { toast('Page title is required', 'crimson'); return; }
      if (status === 'scheduled' && !schedInp.value) { toast('Select a schedule date & time first', 'crimson'); return; }
      var finalBlocks = starterBlocks.slice();
      finalBlocks.push({
        type: 'page_meta',
        layout_variant: layoutSel.value,
        odia_subtitle: odiaSubInp.value.trim(),
        show_in_nav: !!navChk.checked,
        feature_home: !!featChk.checked,
        noindex: !!noindexChk.checked,
        expires_at: expiresInp.value || null
      });
      var ogVal = ogImgInp.value.trim();
      if (ogVal) finalBlocks.push({ type: 'og_meta', og_image: ogVal });
      attachments.forEach(function (att) {
        if (att.role === 'OpenGraph Social Image') {
          if (!ogVal) finalBlocks.push({ type: 'og_meta', og_image: att.url });
          return;
        }
        if (att.is_image && (att.role === 'Hero Cover Image' || att.role === 'Inline Photo')) {
          finalBlocks.push({ type: 'image', url: att.url, title: att.title, alt: att.alt || att.title, role: att.role });
        } else {
          finalBlocks.push({
            type: 'attachment',
            title: att.title,
            url: att.url,
            preview_url: att.preview_url || att.url,
            role: att.role,
            source_kind: att.source_kind,
            source_label: att.source_label,
            domain: att.domain,
            is_image: att.is_image,
            new_tab: att.new_tab !== false
          });
        }
      });
      var payload = {
        route: route,
        title: titleInp.value.trim(),
        meta_description: metaDescInp.value.trim(),
        category: catSel.value,
        hero_title: heroTitleInp.value.trim() || titleInp.value.trim(),
        hero_subtitle: heroSubInp.value.trim(),
        cta_label: ctaLblInp.value.trim(),
        cta_url: ctaUrlInp.value.trim(),
        blocks_json: JSON.stringify(finalBlocks),
        status: status,
        publish_at: status === 'scheduled' ? new Date(schedInp.value).toISOString() : null,
        note: 'Created via Create New Page Wizard'
      };
      try {
        var res = await api('POST', 'pages', payload);
        try { localStorage.removeItem(DRAFT_KEY); clear(recoveryHost); } catch (_) {}
        existingRoutes[res.route] = 1;
        updateAll();
        toast('Page ' + status + ': ' + res.route, 'success');
        clear(resultBanner);
        resultBanner.appendChild(el('div', { class: 'cso-drawer' }, [
          el('div', { class: 'cso-inline-row' }, [
            badge(status, status === 'published' ? 'ok' : 'warn'),
            el('strong', { text: 'Saved route ' + res.route }),
            el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm cso-mod-btn-primary', text: 'Open in Visual Page Builder', onclick: function () { f02State.builderRoute = res.route; window.selectModule && window.selectModule('folder-02', 'module-02-003'); } }),
            el('a', { href: res.route, target: '_blank', rel: 'noopener noreferrer', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Inspect Live Route ↗' }),
            el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Create Another Page', onclick: function () { clear(resultBanner); applyBlueprint('blank'); } })
          ])
        ]));
      } catch (e) {
        toast(e.message, 'crimson');
      }
    }

    renderBanner(shell, 'Create New Page', 'Publish real public routes on csodisha.com/<slug>/ with AI drafting, pre-publish error gate & live previews.', [
      publishBtn,
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'Save Draft', onclick: function () { submitPage('draft'); } }),
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'Schedule', onclick: function () { submitPage('scheduled'); } })
    ]);

    shell.appendChild(recoveryHost);

    // 1. Collapsible AI Page & Article Assistant
    var aiTopicInp = el('input', { type: 'text', class: 'cso-mod-input', placeholder: 'e.g. OPSC OAS 2026 Prelims Notification, Eligibility & Syllabus' });
    var aiNotesInp = el('textarea', { class: 'cso-mod-textarea', rows: '2', placeholder: 'Optional: Paste official notice text, raw notes, or dates…' });
    var aiLangSel = el('select', { class: 'cso-mod-select' }, ['English', 'Odia (ଓଡ଼ିଆ)', 'Bilingual English + Odia'].map(function (l) { return el('option', { value: l, text: l }); }));
    var aiStyleSel = el('select', { class: 'cso-mod-select' }, ['Exam Recruitment Guide', 'Candidate Instructions & Steps', 'Scheme / Benefit Overview', 'Informational Article'].map(function (s) { return el('option', { value: s, text: s }); }));
    var aiProviderBadge = el('span', { class: 'cso-mod-muted', text: 'Cloudflare Workers AI Edge Assistant' });

    function mapAiBlocks(rawBlocks) {
      return (rawBlocks || []).map(function (b) {
        return {
          type: b.type || 'richtext',
          title: b.heading || b.title || (b.type === 'faq' ? b.question : 'Section'),
          text: b.body || b.text || (b.type === 'faq' ? b.answer : ''),
          rows: Array.isArray(b.rows) ? b.rows : undefined,
          question: b.question,
          answer: b.answer
        };
      });
    }

    async function runAiDraft(blocksOnly) {
      var topic = aiTopicInp.value.trim() || titleInp.value.trim();
      if (!topic || topic.length < 3) { toast('Enter a topic for the AI Assistant', 'amber'); aiTopicInp.focus(); return; }
      toast('Generating draft via Workers AI…', 'info');
      try {
        var res = await api('POST', 'ai/generate-page', {
          topic: topic,
          sourceNotes: aiNotesInp.value.trim(),
          category: catSel.value,
          contentStyle: aiStyleSel.value,
          language: aiLangSel.value
        });
        aiProviderBadge.textContent = 'Generated via ' + (res.provider || 'workers-ai');
        if (!blocksOnly) {
          titleInp.value = res.title || titleInp.value;
          slugInp.value = res.slug || slugInp.value;
          delete slugInp.dataset.touched;
          metaDescInp.value = res.meta_description || '';
          heroTitleInp.value = res.hero_title || res.title || '';
          heroSubInp.value = res.hero_subtitle || '';
          odiaSubInp.value = res.odia_subtitle || '';
        }
        starterBlocks = mapAiBlocks(res.blocks);
        renderInitialBlocks();
        updateAll();
        toast('AI draft loaded into editor (unpublished)', 'success');
      } catch (e) { toast(e.message, 'crimson'); }
    }

    shell.appendChild(el('details', { class: 'cso-mod-card' }, [
      el('summary', { class: 'cso-drawer-head' }, [
        el('strong', { text: '✨ AI Page & Article Assistant (Cloudflare Workers AI)' }),
        aiProviderBadge
      ]),
      el('div', { class: 'cso-mod-shell' }, [
        el('div', { class: 'cso-mod-grid-3' }, [
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Topic / Exam Prompt' }), aiTopicInp]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Language' }), aiLangSel]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Content Style' }), aiStyleSel])
        ]),
        el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Paste Official Notice / Raw Notes (optional)' }), aiNotesInp]),
        el('div', { class: 'cso-mod-toolbar' }, [
          el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-primary', text: 'Generate Draft Into Editor', onclick: function () { runAiDraft(false); } }),
          el('button', { type: 'button', class: 'cso-mod-btn', text: 'Regenerate Blocks Only', onclick: function () { runAiDraft(true); } })
        ])
      ])
    ]));

    // 2. Quick-Start Blueprints + Clone From Existing Page
    var cloneSel = el('select', { class: 'cso-mod-select' }, [el('option', { value: '', text: 'Clone From Existing Page…' })]);
    cloneSel.addEventListener('change', function () {
      var r = cloneSel.value;
      if (!r) return;
      var src = allPagesList.find(function (p) { return p.route === r; });
      if (!src) return;
      catSel.value = src.category || 'Core Portal';
      titleInp.value = (src.title || src.route) + ' (Copy)';
      slugInp.value = f02NormalizeRoute((src.route || '/page/').replace(/\/$/, '') + '-copy/');
      slugInp.dataset.touched = '1';
      metaDescInp.value = src.meta_description || '';
      heroTitleInp.value = src.hero_title || '';
      heroSubInp.value = src.hero_subtitle || '';
      ctaLblInp.value = src.cta_label || '';
      ctaUrlInp.value = src.cta_url || '';
      try {
        var parsed = JSON.parse(src.blocks_json || '[]');
        if (Array.isArray(parsed) && parsed.length) {
          starterBlocks = parsed.filter(function (b) { return b && b.type !== 'og_meta' && b.type !== 'page_meta'; });
        }
      } catch (_) {}
      renderInitialBlocks();
      updateAll();
      toast('Cloned layout & blocks from ' + r, 'info');
    });

    shell.appendChild(el('div', { class: 'cso-mod-card' }, [
      el('div', { class: 'cso-drawer-head' }, [
        el('strong', { text: 'Quick-Start Blueprints & Clone' }),
        el('div', { class: 'cso-mod-toolbar' }, [
          el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Blank Page', onclick: function () { applyBlueprint('blank'); } }),
          el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Odisha Exam Guide (OPSC/OSSC)', onclick: function () { applyBlueprint('exam'); } }),
          el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Scheme & Benefit Portal', onclick: function () { applyBlueprint('scheme'); } }),
          el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Institutional / Policy Page', onclick: function () { applyBlueprint('policy'); } }),
          cloneSel
        ])
      ])
    ]));

    shell.appendChild(kpiHost);
    shell.appendChild(validationHost);
    shell.appendChild(resultBanner);

    var tabPageBtn = el('button', { type: 'button', class: 'cso-pill cso-pill-active', text: 'Full Page Live Preview', onclick: function () { previewTab = 'page'; syncPreviewTabs(); updatePreviewPane(); } });
    var tabSerpBtn = el('button', { type: 'button', class: 'cso-pill', text: 'Google SERP Snippet', onclick: function () { previewTab = 'serp'; syncPreviewTabs(); updatePreviewPane(); } });
    var tabOgBtn = el('button', { type: 'button', class: 'cso-pill', text: 'Social OpenGraph Card', onclick: function () { previewTab = 'og'; syncPreviewTabs(); updatePreviewPane(); } });
    var tabJsonLdBtn = el('button', { type: 'button', class: 'cso-pill', text: 'JSON-LD Schema', onclick: function () { previewTab = 'jsonld'; syncPreviewTabs(); updatePreviewPane(); } });
    var vpDeskBtn = el('button', { type: 'button', class: 'cso-pill cso-pill-active', text: 'Desktop', onclick: function () { mobileMode = false; syncPreviewTabs(); updatePreviewPane(); } });
    var vpMobBtn = el('button', { type: 'button', class: 'cso-pill', text: 'Mobile 375px', onclick: function () { mobileMode = true; syncPreviewTabs(); updatePreviewPane(); } });
    function syncPreviewTabs() {
      tabPageBtn.classList.toggle('cso-pill-active', previewTab === 'page');
      tabSerpBtn.classList.toggle('cso-pill-active', previewTab === 'serp');
      tabOgBtn.classList.toggle('cso-pill-active', previewTab === 'og');
      tabJsonLdBtn.classList.toggle('cso-pill-active', previewTab === 'jsonld');
      vpDeskBtn.classList.toggle('cso-pill-active', !mobileMode);
      vpMobBtn.classList.toggle('cso-pill-active', mobileMode);
    }

    var ctaLinkPicker = el('select', { class: 'cso-mod-select' }, [el('option', { value: '', text: 'Verified Internal Link Picker…' })]);
    ctaLinkPicker.addEventListener('change', function () {
      if (ctaLinkPicker.value) { ctaUrlInp.value = ctaLinkPicker.value; updateAll(); }
    });

    shell.appendChild(el('div', { class: 'cso-mod-grid-2' }, [
      el('div', { class: 'cso-mod-card' }, [
        el('h3', { text: 'Route, SEO & Hero Settings' }),
        el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Page Title (50–60 chars optimal)' }), titleInp, titleCount]),
        el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Public Route / Slug' }), slugInp, slugStatusEl]),
        el('div', { class: 'cso-mod-grid-2' }, [
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Category' }), catSel]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Layout Variant' }), layoutSel])
        ]),
        el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Meta Description (120–160 chars optimal)' }), metaDescInp, descCount]),
        el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Hero Headline' }), heroTitleInp]),
        el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Hero Subtitle' }), heroSubInp]),
        el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Odia Subtitle / Tag (ଓଡ଼ିଆ)' }), odiaSubInp]),
        el('div', { class: 'cso-mod-grid-2' }, [
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'CTA Label' }), ctaLblInp]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'CTA URL' }), ctaUrlInp, ctaLinkPicker])
        ]),
        el('div', { class: 'cso-mod-field' }, [
          el('label', { class: 'cso-mod-label', text: 'OpenGraph Social Image URL' }),
          el('div', { class: 'cso-mod-toolbar' }, [
            ogImgInp,
            el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Pick / Upload OG Image', onclick: function () { toggleR2Browser(true); } })
          ])
        ]),
        el('div', { class: 'cso-mod-grid-2' }, [
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Schedule Date/Time' }), schedInp]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Expiry / Review Date (expires_at)' }), expiresInp])
        ]),
        el('div', { class: 'cso-mod-toolbar' }, [
          el('label', { class: 'cso-check-label' }, [navChk, el('span', { text: 'Show in Navigation' })]),
          el('label', { class: 'cso-check-label' }, [featChk, el('span', { text: 'Feature on Homepage' })]),
          el('label', { class: 'cso-check-label' }, [noindexChk, el('span', { text: 'Noindex / Unlisted' })])
        ])
      ]),
      el('div', { class: 'cso-mod-card' }, [
        el('div', { class: 'cso-drawer-head' }, [
          el('h3', { text: 'Real Pre-Publish Preview Studio' }),
          el('div', { class: 'cso-mod-toolbar' }, [vpDeskBtn, vpMobBtn])
        ]),
        el('div', { class: 'cso-pill-row' }, [tabPageBtn, tabSerpBtn, tabOgBtn, tabJsonLdBtn]),
        previewHost
      ])
    ]));

    var r2UploadInp = el('input', { type: 'file', class: 'cso-mod-input', accept: '.pdf,.png,.jpg,.jpeg,.webp,.svg,.doc,.docx,.xls,.xlsx,.csv,.zip' });
    r2UploadInp.addEventListener('change', async function () {
      var f = r2UploadInp.files[0];
      if (!f) return;
      var fd = new FormData();
      fd.append('file', f);
      try {
        var d = await api('POST', 'media/upload', fd, true);
        var url = d.url || ('/api/media/' + (d.key || d.object_key));
        var isImg = d.kind === 'image' || /\.(png|jpe?g|webp)$/i.test(url);
        var isPdf = d.kind === 'pdf' || /\.pdf$/i.test(url);
        addAttachment({
          id: 'att-' + Date.now(),
          title: f.name,
          alt: isImg ? f.name.replace(/\.[a-z0-9]+$/i, '') : '',
          url: url, preview_url: url,
          role: isImg ? 'Hero Cover Image' : 'Downloadable PDF/File',
          source_kind: 'r2', source_label: isImg ? 'R2 Photo' : (isPdf ? 'R2 PDF' : 'R2 File'),
          domain: 'csodisha.com (R2)', is_image: isImg, is_pdf: isPdf, new_tab: true
        });
        toast('Uploaded to R2 & attached: ' + f.name, 'success');
      } catch (e) { toast(e.message, 'crimson'); }
      r2UploadInp.value = '';
    });

    var extTitleInp = el('input', { type: 'text', class: 'cso-mod-input', placeholder: 'Link Title (e.g. Official OPSC Notification PDF)' });
    var extUrlInp = el('input', { type: 'url', class: 'cso-mod-input', placeholder: 'https://opsc.gov.in/... or https://drive.google.com/file/d/...' });
    var extLinkPicker = el('select', { class: 'cso-mod-select' }, [el('option', { value: '', text: 'Or pick verified internal route…' })]);
    extLinkPicker.addEventListener('change', function () {
      if (extLinkPicker.value) {
        extUrlInp.value = extLinkPicker.value;
        if (!extTitleInp.value.trim()) extTitleInp.value = extLinkPicker.options[extLinkPicker.selectedIndex].text;
      }
    });
    var extTypeSel = el('select', { class: 'cso-mod-select' }, [
      'Official Website (.gov.in)', 'Google Drive File/Folder', 'Direct PDF URL', 'Apply Online CTA', 'Reference Link'
    ].map(function (t) { return el('option', { value: t, text: t }); }));

    shell.appendChild(el('div', { class: 'cso-mod-card' }, [
      el('div', { class: 'cso-drawer-head' }, [
        el('h3', { text: 'Media, Files & External Links (R2 + Official + Google Drive)' }),
        el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Pick from R2 Library', onclick: function () { toggleR2Browser(); } })
      ]),
      el('div', { class: 'cso-mod-grid-2' }, [
        el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Upload File to R2 (PDF, JPG, PNG, WebP)' }), r2UploadInp]),
        el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Link Type' }), extTypeSel])
      ]),
      el('div', { class: 'cso-mod-grid-3' }, [
        extTitleInp,
        el('div', { class: 'cso-mod-shell' }, [extUrlInp, extLinkPicker]),
        el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-primary', text: '+ Attach External / Drive Link', onclick: function () {
          var u = extUrlInp.value.trim();
          var t = extTitleInp.value.trim();
          if (!u || (!/^https?:\/\//i.test(u) && u.indexOf('/') !== 0)) { toast('Enter a valid http(s) or site-relative URL', 'amber'); return; }
          var meta = detectLinkMeta(u, extTypeSel.value);
          var role = extTypeSel.value === 'Apply Online CTA' ? 'Apply Online CTA' :
                     meta.source_kind === 'gdrive' ? 'Google Drive Document' :
                     meta.source_kind === 'gov' ? 'Official Portal Link' :
                     meta.is_pdf ? 'Downloadable PDF/File' : 'Official Portal Link';
          addAttachment({
            id: 'att-' + Date.now(),
            title: t || meta.source_label + ' Link',
            alt: meta.is_image ? (t || meta.source_label) : '',
            url: u, preview_url: meta.preview_url,
            role: role, source_kind: meta.source_kind, source_label: meta.source_label,
            domain: meta.domain, is_image: meta.is_image, is_pdf: meta.is_pdf, new_tab: true
          });
          extTitleInp.value = ''; extUrlInp.value = ''; extLinkPicker.value = '';
          toast('Attached ' + meta.source_label + ' link', 'success');
        } })
      ]),
      r2LibraryHost,
      attachPreviewHost,
      attachListHost
    ]));

    shell.appendChild(el('div', { class: 'cso-mod-card' }, [
      el('div', { class: 'cso-drawer-head' }, [
        el('h3', { text: 'Initial Content Blocks' }),
        el('div', { class: 'cso-mod-toolbar' }, [
          el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: '+ Rich Text', onclick: function () { starterBlocks.push({ type: 'richtext', title: 'Section', text: 'Add detailed information here.' }); renderInitialBlocks(); updateAll(); } }),
          el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: '+ Notice', onclick: function () { starterBlocks.push({ type: 'notice', title: 'Notice', text: 'Important update for candidates.' }); renderInitialBlocks(); updateAll(); } }),
          el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: '+ Key Dates Table', onclick: function () { starterBlocks.push({ type: 'key_dates', title: 'Key Dates', rows: [{ label: 'Start Date', value: 'TBD' }, { label: 'Last Date', value: 'TBD' }] }); renderInitialBlocks(); updateAll(); } }),
          el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: '+ FAQ Item', onclick: function () { starterBlocks.push({ type: 'faq', title: 'Frequently Asked Question', question: 'Frequently Asked Question', text: 'Clear answer for Odisha aspirants.', answer: 'Clear answer for Odisha aspirants.' }); renderInitialBlocks(); updateAll(); } }),
          el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: '+ Official / Drive Link', onclick: function () { starterBlocks.push({ type: 'official_links', title: 'Official / Google Drive Link', text: 'Official Portal or Drive Document', url: 'https://odisha.gov.in' }); renderInitialBlocks(); updateAll(); } }),
          el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: '+ Photo / PDF Attachment', onclick: function () { toggleR2Browser(true); toast('Pick or upload a Photo/PDF in Media, Files & External Links above', 'info'); } })
        ])
      ]),
      blocksHost
    ]));

    root.appendChild(shell);

    // 3. Check localStorage Draft Recovery
    try {
      var savedRaw = localStorage.getItem(DRAFT_KEY);
      if (savedRaw) {
        var saved = JSON.parse(savedRaw);
        if (saved && (saved.title || saved.meta)) {
          recoveryHost.appendChild(el('div', { class: 'cso-drawer' }, [
            el('div', { class: 'cso-drawer-head' }, [
              el('strong', { text: 'Unsaved Draft Found (' + (saved.title || saved.slug || 'Untitled') + ')' }),
              el('div', { class: 'cso-mod-toolbar' }, [
                el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm cso-mod-btn-primary', text: 'Restore Unsaved Draft', onclick: function () {
                  titleInp.value = saved.title || '';
                  slugInp.value = saved.slug || '/new-page/';
                  slugInp.dataset.touched = '1';
                  catSel.value = saved.category || 'Core Portal';
                  metaDescInp.value = saved.meta || '';
                  heroTitleInp.value = saved.heroTitle || '';
                  heroSubInp.value = saved.heroSub || '';
                  odiaSubInp.value = saved.odiaSub || '';
                  ctaLblInp.value = saved.ctaLabel || '';
                  ctaUrlInp.value = saved.ctaUrl || '';
                  ogImgInp.value = saved.ogImg || '';
                  layoutSel.value = saved.layout || 'Standard Portal';
                  navChk.checked = !!saved.showNav;
                  featChk.checked = !!saved.featureHome;
                  noindexChk.checked = !!saved.noindex;
                  expiresInp.value = saved.expiresAt || '';
                  if (Array.isArray(saved.blocks)) starterBlocks = saved.blocks;
                  if (Array.isArray(saved.attachments)) attachments = saved.attachments;
                  clear(recoveryHost);
                  renderAttachments();
                  renderInitialBlocks();
                  updateAll();
                  toast('Restored unsaved draft', 'success');
                } }),
                el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Discard', onclick: function () { localStorage.removeItem(DRAFT_KEY); clear(recoveryHost); } })
              ])
            ])
          ]));
        }
      }
    } catch (_) {}

    renderAttachments();
    renderInitialBlocks();
    updateAll();

    Promise.all([
      api('GET', 'pages').catch(function () { return { pages: [] }; }),
      api('GET', 'mock-tests?limit=50').catch(function () { return { items: [] }; }),
      api('GET', 'jobs?limit=50').catch(function () { return { items: [] }; })
    ]).then(function (allRes) {
      allPagesList = allRes[0].pages || [];
      allPagesList.forEach(function (p) {
        existingRoutes[p.route] = 1;
        cloneSel.appendChild(el('option', { value: p.route, text: p.route + ' — ' + (p.title || '').slice(0, 36) }));
        verifiedRoutes.push({ url: p.route, label: 'Page: ' + p.route });
      });
      (allRes[1].items || []).forEach(function (t) {
        verifiedRoutes.push({ url: '/mock-tests/?test=' + encodeURIComponent(t.slug || t.id), label: 'Mock Test: ' + t.title });
      });
      (allRes[2].items || []).forEach(function (j) {
        verifiedRoutes.push({ url: '/jobs-careers/?job=' + encodeURIComponent(j.slug || j.id), label: 'Job: ' + j.title });
      });
      verifiedRoutes.forEach(function (vr) {
        ctaLinkPicker.appendChild(el('option', { value: vr.url, text: vr.label }));
        extLinkPicker.appendChild(el('option', { value: vr.url, text: vr.label }));
      });
      updateAll();
    });
  }

  /* -------------------------------------------------------------------------
     02-003: Visual Page Builder (Live /api/admin/pages + 7 Rich Block Types)
     ------------------------------------------------------------------------- */
  function renderVisualPageBuilder(root, actions) {
    addHeaderPill(actions, '● Live Visual Builder');
    var shell = el('div', { class: 'cso-mod-shell' });
    var viewport = 'desktop';
    var pagesMap = {};
    var currentRoute = f02State.builderRoute || '/custom-portal/';
    f02State.builderRoute = null;

    var tpl = f02State.builderTemplate;
    f02State.builderTemplate = null;

    var pageMeta = {
      title: tpl ? tpl.name : 'Custom Odisha Portal',
      meta_description: tpl ? tpl.meta_description : '',
      category: tpl ? tpl.category : 'Core Portal',
      hero_title: tpl ? tpl.hero_title : '',
      hero_subtitle: tpl ? tpl.hero_subtitle : '',
      cta_label: tpl ? tpl.cta_label : '',
      cta_url: tpl ? tpl.cta_url : ''
    };
    var blocks = tpl ? JSON.parse(JSON.stringify(tpl.blocks || [])) : [
      { type: 'hero', title: 'Odisha Government Jobs & Exam Portal', text: 'Verified recruitment alerts, syllabus PDFs, and CBT mock tests.', label: 'Explore Jobs', url: '/jobs-careers/' },
      { type: 'ticker', title: 'Latest Odisha Job Notifications' },
      { type: 'cbt', title: 'Start Free CBT Mock Tests', text: 'Practice bilingual Odia & English papers with instant explanations.', label: 'Launch Tests', url: '/mock-tests/' }
    ];
    if (tpl) currentRoute = '/' + tpl.id + '/';

    var pageSelect = el('select', { class: 'cso-mod-select' }, [el('option', { value: '__CUSTOM__', text: '+ Custom / New Route' })]);
    var routeInput = el('input', { type: 'text', class: 'cso-mod-input', value: currentRoute, placeholder: '/my-route/' });
    var canvasEl = el('div', { class: 'cso-builder-viewport-desktop' });
    var propHost = el('div', { class: 'cso-mod-card' });
    var metaHost = el('div', { class: 'cso-mod-card' });
    var openLiveLink = el('a', { href: currentRoute, target: '_blank', rel: 'noopener noreferrer', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Open Live ↗' });
    var selectedIdx = 0;

    var BLOCK_TYPES = [
      { type: 'hero', label: 'Hero', def: { type: 'hero', title: 'Hero Headline', text: 'Supporting description for aspirants.', label: 'Explore', url: '/jobs-careers/' } },
      { type: 'ticker', label: 'Live Job Ticker', def: { type: 'ticker', title: 'Latest Odisha Govt Jobs' } },
      { type: 'examgrid', label: 'Exam Grid', def: { type: 'examgrid', title: 'Exam Portals', items: ['OSSC CGL|/jobs-careers/', 'OPSC OAS|/syllabus/', 'Mock Tests|/mock-tests/'] } },
      { type: 'cbt', label: 'CBT Card', def: { type: 'cbt', title: 'Practice CBT Mock Test', text: 'Timed bilingual practice paper.', label: 'Start CBT', url: '/mock-tests/' } },
      { type: 'faq', label: 'FAQ Accordion', def: { type: 'faq', title: 'Frequently Asked Questions', items: ['How to apply?|Visit the official commission link.', 'Is it free?|Yes, 100% free for candidates.'] } },
      { type: 'notice', label: 'Notice Callout', def: { type: 'notice', title: 'Official Notice', text: 'Verify dates and roll numbers on the official portal.' } },
      { type: 'richtext', label: 'Rich Text', def: { type: 'richtext', text: 'Write multi-paragraph guidance here.\n\nSeparate paragraphs with a blank line.' } }
    ];

    function setViewport(vp) {
      viewport = vp;
      canvasEl.className = 'cso-builder-viewport-' + vp;
    }

    function renderMetaCard() {
      clear(metaHost);
      metaHost.appendChild(el('h4', { text: 'Page Route & SEO' }));
      var tInp = el('input', { type: 'text', class: 'cso-mod-input', value: pageMeta.title || '' });
      var dInp = el('input', { type: 'text', class: 'cso-mod-input', value: pageMeta.meta_description || '' });
      tInp.addEventListener('input', function () { pageMeta.title = tInp.value; });
      dInp.addEventListener('input', function () { pageMeta.meta_description = dInp.value; });
      routeInput.addEventListener('input', function () {
        currentRoute = f02NormalizeRoute(routeInput.value);
        openLiveLink.setAttribute('href', currentRoute);
      });
      metaHost.appendChild(el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Target Route' }), routeInput]));
      metaHost.appendChild(el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Page Title' }), tInp]));
      metaHost.appendChild(el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Meta Description' }), dInp]));
    }

    function renderInspector() {
      clear(propHost);
      propHost.appendChild(el('h4', { text: 'Block Inspector' }));
      var b = blocks[selectedIdx];
      if (!b) {
        propHost.appendChild(el('p', { class: 'cso-mod-muted', text: 'Select or add a block.' }));
        return;
      }
      propHost.appendChild(el('div', { class: 'cso-mod-field' }, [badge('Type: ' + b.type, 'info')]));
      if (b.type !== 'richtext') {
        var hInp = el('input', { type: 'text', class: 'cso-mod-input', value: b.title || b.heading || '' });
        hInp.addEventListener('input', function () { b.title = hInp.value; renderCanvas(); });
        propHost.appendChild(el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Title / Heading' }), hInp]));
      }
      if (b.type === 'hero' || b.type === 'cbt' || b.type === 'notice' || b.type === 'richtext') {
        var bodyInp = el('textarea', { class: 'cso-mod-textarea' });
        bodyInp.value = b.text || b.body || '';
        bodyInp.addEventListener('input', function () { b.text = bodyInp.value; renderCanvas(); });
        propHost.appendChild(el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Body Text' }), bodyInp]));
      }
      if (b.type === 'hero' || b.type === 'cbt') {
        var lblInp = el('input', { type: 'text', class: 'cso-mod-input', value: b.label || b.ctaText || '' });
        var urlInp = el('input', { type: 'text', class: 'cso-mod-input', value: b.url || b.ctaUrl || '' });
        lblInp.addEventListener('input', function () { b.label = lblInp.value; renderCanvas(); });
        urlInp.addEventListener('input', function () { b.url = urlInp.value; renderCanvas(); });
        propHost.appendChild(el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'CTA Label' }), lblInp]));
        propHost.appendChild(el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'CTA URL' }), urlInp]));
      }
      if (b.type === 'examgrid' || b.type === 'faq') {
        var itemsInp = el('textarea', { class: 'cso-mod-textarea' });
        itemsInp.value = Array.isArray(b.items) ? b.items.join('\n') : (b.items || '');
        itemsInp.addEventListener('input', function () {
          b.items = itemsInp.value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
          renderCanvas();
        });
        propHost.appendChild(el('div', { class: 'cso-mod-field' }, [
          el('label', { class: 'cso-mod-label', text: b.type === 'faq' ? 'Items (Question | Answer per line)' : 'Items (Label | /url per line)' }),
          itemsInp
        ]));
      }
    }

    function renderCanvas() {
      clear(canvasEl);
      if (!blocks.length) {
        canvasEl.appendChild(el('p', { class: 'cso-mod-muted', text: 'No blocks yet. Click a block in the palette to add it.' }));
        return;
      }
      blocks.forEach(function (b, idx) {
        var blk = el('div', { class: 'cso-builder-block' }, [
          el('div', { class: 'cso-builder-block-head' }, [
            badge((idx + 1) + '. ' + b.type, idx === selectedIdx ? 'ok' : 'info'),
            el('div', { class: 'cso-mod-toolbar' }, [
              el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Edit', onclick: function () { selectedIdx = idx; renderInspector(); renderCanvas(); } }),
              el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: '↑', onclick: function () { if (idx > 0) { var t = blocks[idx - 1]; blocks[idx - 1] = blocks[idx]; blocks[idx] = t; selectedIdx = idx - 1; renderCanvas(); renderInspector(); } } }),
              el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: '↓', onclick: function () { if (idx < blocks.length - 1) { var t = blocks[idx + 1]; blocks[idx + 1] = blocks[idx]; blocks[idx] = t; selectedIdx = idx + 1; renderCanvas(); renderInspector(); } } }),
              el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-danger cso-mod-btn-sm', text: '✕', onclick: function () { blocks.splice(idx, 1); selectedIdx = Math.max(0, selectedIdx - 1); renderCanvas(); renderInspector(); } })
            ])
          ]),
          el('h4', { text: b.title || b.heading || b.type.toUpperCase() }),
          b.text || b.body ? el('p', { class: 'cso-mod-muted', text: b.text || b.body }) : null,
          Array.isArray(b.items) && b.items.length ? el('ul', {}, b.items.map(function (it) { return el('li', { text: it }); })) : null,
          (b.label || b.ctaText) ? el('span', { class: 'cso-mod-badge cso-mod-badge-info', text: (b.label || b.ctaText) + ' → ' + (b.url || b.ctaUrl || '/') }) : null
        ]);
        canvasEl.appendChild(blk);
      });
    }

    async function saveBuilder(status) {
      var route = f02NormalizeRoute(routeInput.value || currentRoute);
      if (!pageMeta.title) pageMeta.title = route;
      try {
        await api('PUT', 'pages', {
          route: route,
          title: pageMeta.title,
          meta_description: pageMeta.meta_description,
          category: pageMeta.category || 'Core Portal',
          hero_title: pageMeta.hero_title,
          hero_subtitle: pageMeta.hero_subtitle,
          cta_label: pageMeta.cta_label,
          cta_url: pageMeta.cta_url,
          blocks_json: JSON.stringify(blocks),
          status: status,
          note: 'Visual Page Builder (' + blocks.length + ' blocks)'
        });
        openLiveLink.setAttribute('href', route);
        toast((status === 'published' ? 'Published live: ' : 'Saved draft: ') + route, 'success');
      } catch (e) {
        toast(e.message, 'crimson');
      }
    }

    function loadPageIntoBuilder(p) {
      currentRoute = p.route;
      routeInput.value = p.route;
      openLiveLink.setAttribute('href', p.route);
      pageMeta = {
        title: p.title || '',
        meta_description: p.meta_description || '',
        category: p.category || 'Core Portal',
        hero_title: p.hero_title || '',
        hero_subtitle: p.hero_subtitle || '',
        cta_label: p.cta_label || '',
        cta_url: p.cta_url || ''
      };
      var parsed = f02ParseBlocks(p.blocks_json);
      if (parsed.length) {
        blocks = parsed;
      } else {
        blocks = [
          { type: 'hero', title: p.hero_title || p.title || p.route, text: p.hero_subtitle || p.meta_description || '', label: p.cta_label || 'Explore', url: p.cta_url || '/' }
        ];
      }
      selectedIdx = 0;
      renderMetaCard();
      renderCanvas();
      renderInspector();
    }

    pageSelect.addEventListener('change', function () {
      var v = pageSelect.value;
      if (v === '__CUSTOM__') {
        routeInput.value = '/custom-page/';
        currentRoute = '/custom-page/';
        return;
      }
      if (pagesMap[v]) loadPageIntoBuilder(pagesMap[v]);
    });

    var paletteCard = el('div', { class: 'cso-mod-card' }, [
      el('h4', { text: 'Block Palette' }),
      el('p', { class: 'cso-mod-muted', text: 'Click to append a live block:' })
    ]);
    BLOCK_TYPES.forEach(function (bt) {
      paletteCard.appendChild(el('button', {
        type: 'button',
        class: 'cso-mod-btn',
        text: '+ ' + bt.label,
        onclick: function () {
          blocks.push(JSON.parse(JSON.stringify(bt.def)));
          selectedIdx = blocks.length - 1;
          renderCanvas();
          renderInspector();
        }
      }));
    });

    renderBanner(shell, 'Visual Page Builder', 'Compose responsive blocks for any route and publish live to csodisha.com.', [
      pageSelect,
      el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Desktop', onclick: function () { setViewport('desktop'); } }),
      el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: '768px', onclick: function () { setViewport('tablet'); } }),
      el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: '375px', onclick: function () { setViewport('mobile'); } }),
      el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-primary cso-mod-btn-sm', text: 'Publish Live to Website', onclick: function () { saveBuilder('published'); } }),
      el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Save Draft', onclick: function () { saveBuilder('draft'); } }),
      openLiveLink,
      el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Export JSON', onclick: function () { downloadFile('page-blocks.json', JSON.stringify(blocks, null, 2)); } })
    ]);

    shell.appendChild(el('div', { class: 'cso-builder-split' }, [
      el('div', { class: 'cso-mod-shell' }, [metaHost, paletteCard, propHost]),
      el('div', { class: 'cso-builder-canvas-wrap' }, [canvasEl])
    ]));

    root.appendChild(shell);
    renderMetaCard();
    renderCanvas();
    renderInspector();

    api('GET', 'pages').then(function (d) {
      (d.pages || []).forEach(function (p) {
        pagesMap[p.route] = p;
        pageSelect.appendChild(el('option', { value: p.route, text: (p.title || p.route) + ' (' + p.route + ')' }));
      });
      if (!tpl && pagesMap[currentRoute]) {
        pageSelect.value = currentRoute;
        loadPageIntoBuilder(pagesMap[currentRoute]);
      }
    }).catch(function () {});
  }

  /* -------------------------------------------------------------------------
     02-004: Homepage Builder (Live /api/admin/banner + / in site_pages + iframe)
     ------------------------------------------------------------------------- */
  function renderHomepageBuilder(root, actions) {
    addHeaderPill(actions, '● Live Homepage Studio');
    var shell = el('div', { class: 'cso-mod-shell' });

    var activeChk = el('input', { type: 'checkbox' });
    var sevSel = el('select', { class: 'cso-mod-select' }, ['info', 'notice', 'urgent'].map(function (s) { return el('option', { value: s, text: s.toUpperCase() }); }));
    var bHeadInp = el('input', { type: 'text', class: 'cso-mod-input', placeholder: 'Urgent announcement headline (max 160 chars)' });
    var bCtxInp = el('input', { type: 'text', class: 'cso-mod-input', placeholder: 'Supporting context (max 300 chars)' });
    var bCtaInp = el('input', { type: 'text', class: 'cso-mod-input', placeholder: 'Button label (max 40 chars)' });
    var bUrlInp = el('input', { type: 'text', class: 'cso-mod-input', placeholder: '/jobs-careers/' });

    var seoTitleInp = el('input', { type: 'text', class: 'cso-mod-input', placeholder: 'Homepage SEO Title' });
    var seoDescInp = el('textarea', { class: 'cso-mod-textarea', placeholder: 'Homepage Meta Description' });
    var heroTitleInp = el('input', { type: 'text', class: 'cso-mod-input', placeholder: 'Homepage Hero Headline' });
    var heroSubInp = el('input', { type: 'text', class: 'cso-mod-input', placeholder: 'Homepage Hero Subtitle' });
    var ctaLblInp = el('input', { type: 'text', class: 'cso-mod-input', placeholder: 'Primary CTA Label' });
    var ctaUrlInp = el('input', { type: 'text', class: 'cso-mod-input', placeholder: '/jobs-careers/' });

    var frame = el('iframe', { src: '/?preview=1&t=' + Date.now(), class: 'cso-preview-frame', title: 'Live Homepage Preview' });
    function refreshFrame() { frame.src = '/?preview=1&t=' + Date.now(); }

    async function loadHomepage() {
      try {
        var [b, pRes] = await Promise.all([api('GET', 'banner'), api('GET', 'pages')]);
        activeChk.checked = !!b.active;
        sevSel.value = b.severity || 'info';
        bHeadInp.value = b.headline || '';
        bCtxInp.value = b.context || '';
        bCtaInp.value = b.ctaText || '';
        bUrlInp.value = b.ctaUrl || '';

        var home = (pRes.pages || []).find(function (x) { return x.route === '/'; }) || {};
        seoTitleInp.value = home.title || '';
        seoDescInp.value = home.meta_description || '';
        heroTitleInp.value = home.hero_title || '';
        heroSubInp.value = home.hero_subtitle || '';
        ctaLblInp.value = home.cta_label || '';
        ctaUrlInp.value = home.cta_url || '';
      } catch (e) {
        toast(e.message, 'crimson');
      }
    }

    async function publishHomepage() {
      try {
        await api('PUT', 'banner', {
          active: activeChk.checked,
          severity: sevSel.value,
          headline: bHeadInp.value.trim(),
          context: bCtxInp.value.trim(),
          ctaText: bCtaInp.value.trim(),
          ctaUrl: bUrlInp.value.trim()
        });
        await api('PUT', 'pages', {
          route: '/',
          title: seoTitleInp.value.trim() || 'Common Sense Odisha',
          meta_description: seoDescInp.value.trim(),
          category: 'Core Portal',
          hero_title: heroTitleInp.value.trim(),
          hero_subtitle: heroSubInp.value.trim(),
          cta_label: ctaLblInp.value.trim(),
          cta_url: ctaUrlInp.value.trim(),
          status: 'published',
          note: 'Homepage Builder live publish'
        });
        toast('Homepage & Live Banner published!', 'success');
        refreshFrame();
      } catch (e) {
        toast(e.message, 'crimson');
      }
    }

    renderBanner(shell, 'Homepage Builder', 'Real-time editor for / (Live Broadcast Banner + Homepage Hero & SEO) with live iframe preview.', [
      el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-primary', text: 'Publish Homepage Live', onclick: publishHomepage }),
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'Refresh Preview', onclick: refreshFrame }),
      el('a', { href: '/', target: '_blank', rel: 'noopener noreferrer', class: 'cso-mod-btn', text: 'Open Live / ↗' })
    ]);

    shell.appendChild(el('div', { class: 'cso-mod-grid-2' }, [
      el('div', { class: 'cso-mod-shell' }, [
        el('div', { class: 'cso-mod-card' }, [
          el('h3', { text: '1. Live Broadcast Banner (/api/admin/banner)' }),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-check-label' }, [activeChk, el('span', { text: 'Banner Active on Live Website' })])]),
          el('div', { class: 'cso-mod-grid-2' }, [
            el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Severity' }), sevSel]),
            el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Headline' }), bHeadInp])
          ]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Context' }), bCtxInp]),
          el('div', { class: 'cso-mod-grid-2' }, [
            el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'CTA Button' }), bCtaInp]),
            el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'CTA URL' }), bUrlInp])
          ])
        ]),
        el('div', { class: 'cso-mod-card' }, [
          el('h3', { text: '2. Homepage Hero & SEO (site_pages /)' }),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'SEO Title' }), seoTitleInp]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Meta Description' }), seoDescInp]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Hero Headline' }), heroTitleInp]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Hero Subtitle' }), heroSubInp]),
          el('div', { class: 'cso-mod-grid-2' }, [
            el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Hero CTA Label' }), ctaLblInp]),
            el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Hero CTA URL' }), ctaUrlInp])
          ])
        ])
      ]),
      el('div', { class: 'cso-mod-card' }, [
        el('div', { class: 'cso-drawer-head' }, [
          el('h3', { text: 'Live Homepage Preview (https://csodisha.com/)' }),
          badge('Live', 'ok')
        ]),
        el('div', { class: 'cso-preview-frame-wrap' }, [frame])
      ])
    ]));

    root.appendChild(shell);
    loadHomepage();
  }

  /* -------------------------------------------------------------------------
     02-005: Landing Pages (SEO/CTA Audits + Inline Edit + Clone Live)
     ------------------------------------------------------------------------- */
  function renderLandingPagesStudio(root, actions) {
    addHeaderPill(actions, '● Landing Pages');
    var shell = el('div', { class: 'cso-mod-shell' });
    var drawerHost = el('div', {});
    var tableHost = el('div', {});

    function openCloneDrawer(p) {
      clear(drawerHost);
      var base = p.route === '/' ? '/campaign-home/' : p.route.replace(/\/$/, '') + '-copy/';
      var slugInp = el('input', { type: 'text', class: 'cso-mod-input', value: base });
      var titleInp = el('input', { type: 'text', class: 'cso-mod-input', value: (p.title || 'Landing Page') + ' (Copy)' });
      var cloneBtn = el('button', {
        type: 'button',
        class: 'cso-mod-btn cso-mod-btn-primary',
        text: 'Clone & Publish Live',
        onclick: async function () {
          cloneBtn.disabled = true;
          try {
            var newRoute = f02NormalizeRoute(slugInp.value);
            await api('POST', 'pages', {
              route: newRoute,
              title: titleInp.value.trim(),
              meta_description: p.meta_description || '',
              category: p.category || 'Core Portal',
              hero_title: p.hero_title || titleInp.value.trim(),
              hero_subtitle: p.hero_subtitle || '',
              cta_label: p.cta_label || 'Explore Now',
              cta_url: p.cta_url || '/jobs-careers/',
              blocks_json: p.blocks_json || '[]',
              status: 'published',
              note: 'Cloned from ' + p.route
            });
            toast('Cloned & published live: ' + newRoute, 'success');
            clear(drawerHost);
            await loadLanding();
          } catch (e) { toast(e.message, 'crimson'); }
          finally { cloneBtn.disabled = false; }
        }
      });
      drawerHost.appendChild(el('div', { class: 'cso-drawer' }, [
        el('div', { class: 'cso-drawer-head' }, [
          el('strong', { text: 'Clone as New Live Landing Page — ' + p.route }),
          el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Close', onclick: function () { clear(drawerHost); } })
        ]),
        el('div', { class: 'cso-mod-grid-2' }, [
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'New Live Route' }), slugInp]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'New Page Title' }), titleInp])
        ]),
        cloneBtn
      ]));
    }

    function openInlineEdit(p) {
      clear(drawerHost);
      var tInp = el('input', { type: 'text', class: 'cso-mod-input', value: p.title || '' });
      var dInp = el('input', { type: 'text', class: 'cso-mod-input', value: p.meta_description || '' });
      var cLbl = el('input', { type: 'text', class: 'cso-mod-input', value: p.cta_label || '' });
      var cUrl = el('input', { type: 'text', class: 'cso-mod-input', value: p.cta_url || '' });
      drawerHost.appendChild(el('div', { class: 'cso-drawer' }, [
        el('div', { class: 'cso-drawer-head' }, [
          el('strong', { text: 'Edit Landing Page SEO & CTA — ' + p.route }),
          el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Close', onclick: function () { clear(drawerHost); } })
        ]),
        el('div', { class: 'cso-mod-grid-2' }, [
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Title' }), tInp]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Meta Description' }), dInp]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'CTA Label' }), cLbl]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'CTA URL' }), cUrl])
        ]),
        el('button', {
          type: 'button',
          class: 'cso-mod-btn cso-mod-btn-primary',
          text: 'Save Live',
          onclick: async function () {
            try {
              await api('PUT', 'pages', { route: p.route, title: tInp.value.trim(), meta_description: dInp.value.trim(), cta_label: cLbl.value.trim(), cta_url: cUrl.value.trim(), status: 'published', note: 'Landing page inline edit' });
              toast('Updated landing page: ' + p.route, 'success');
              clear(drawerHost);
              await loadLanding();
            } catch (e) { toast(e.message, 'crimson'); }
          }
        })
      ]));
    }

    async function loadLanding() {
      clear(tableHost);
      try {
        var d = await api('GET', 'pages');
        var list = (d.pages || []).filter(function (p) {
          return p.category === 'Core Portal' || p.category === 'Exam Guide' || p.category === 'Recruitment' || p.source === 'dynamic';
        });
        var rows = list.map(function (p) {
          var seoOk = (p.title || '').length > 0 && (p.meta_description || '').length >= 40;
          var ctaOk = !!(p.cta_label && p.cta_url);
          return el('tr', {}, [
            el('td', {}, [el('strong', { text: p.title || p.route }), el('div', {}, el('code', { text: p.route }))]),
            el('td', {}, [badge(seoOk ? 'SEO OK' : 'Check Meta', seoOk ? 'ok' : 'warn'), ' ', badge(ctaOk ? 'CTA Ready' : 'No CTA', ctaOk ? 'ok' : 'info')]),
            el('td', {}, f02StatusBadge(p.status)),
            el('td', {}, el('div', { class: 'cso-mod-toolbar' }, [
              el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Edit SEO/CTA', onclick: function () { openInlineEdit(p); } }),
              el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-primary cso-mod-btn-sm', text: 'Clone Live', onclick: function () { openCloneDrawer(p); } }),
              el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Builder', onclick: function () { f02State.builderRoute = p.route; window.selectModule && window.selectModule('folder-02', 'module-02-003'); } }),
              el('a', { href: p.route, target: '_blank', rel: 'noopener noreferrer', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Open ↗' })
            ]))
          ]);
        });
        tableHost.appendChild(safeTable(['Landing Route', 'SEO & CTA Audit', 'Status', 'Actions'], rows));
      } catch (e) {
        tableHost.appendChild(el('p', { class: 'cso-mod-muted', text: e.message }));
      }
    }

    renderBanner(shell, 'Landing Pages Studio', 'Audit portal & campaign landing routes, edit SEO/CTAs inline, or clone as new live pages.', [
      el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-primary', text: '+ New Landing Page', onclick: function () { window.selectModule && window.selectModule('folder-02', 'module-02-002'); } }),
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'Refresh', onclick: loadLanding })
    ]);
    shell.appendChild(drawerHost);
    shell.appendChild(tableHost);
    root.appendChild(shell);
    loadLanding();
  }

  /* -------------------------------------------------------------------------
     02-006: Page Templates (6 Odisha Blueprints -> Create Page / Builder)
     ------------------------------------------------------------------------- */
  function renderPageTemplatesGallery(root, actions) {
    addHeaderPill(actions, '● 6 Odisha Blueprints');
    var shell = el('div', { class: 'cso-mod-shell' });
    renderBanner(shell, 'Page Templates Gallery', '6 Odisha exam & portal starter blueprints ready to instantiate into Create Page or Visual Builder.', [
      el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-primary', text: 'Open Visual Page Builder', onclick: function () { window.selectModule && window.selectModule('folder-02', 'module-02-003'); } })
    ]);
    var grid = el('div', { class: 'cso-mod-grid-2' });
    F02_TEMPLATES.forEach(function (tpl) {
      grid.appendChild(el('div', { class: 'cso-mod-card' }, [
        el('div', { class: 'cso-drawer-head' }, [
          el('h3', { text: tpl.name }),
          badge(tpl.category, 'info')
        ]),
        el('p', { class: 'cso-mod-muted', text: tpl.meta_description }),
        el('p', { class: 'cso-mod-muted', text: 'Includes ' + tpl.blocks.length + ' blocks: ' + tpl.blocks.map(function (b) { return b.type; }).join(', ') }),
        el('div', { class: 'cso-mod-toolbar' }, [
          el('button', {
            type: 'button',
            class: 'cso-mod-btn cso-mod-btn-primary cso-mod-btn-sm',
            text: 'Use in Create Page',
            onclick: function () { f02State.createTemplate = tpl; window.selectModule && window.selectModule('folder-02', 'module-02-002'); }
          }),
          el('button', {
            type: 'button',
            class: 'cso-mod-btn cso-mod-btn-sm',
            text: 'Open in Visual Builder',
            onclick: function () { f02State.builderTemplate = tpl; window.selectModule && window.selectModule('folder-02', 'module-02-003'); }
          })
        ])
      ]));
    });
    shell.appendChild(grid);
    root.appendChild(shell);
  }

  /* -------------------------------------------------------------------------
     02-007: Reusable Sections (/__sitewide + /api/admin/banner)
     ------------------------------------------------------------------------- */
  function renderReusableSectionsStudio(root, actions) {
    addHeaderPill(actions, '● Sitewide Sections');
    var shell = el('div', { class: 'cso-mod-shell' });
    var grid = el('div', { class: 'cso-mod-grid-2' });

    var DEFAULT_SECTIONS = [
      { id: 'candidate-cta', name: 'Candidate Portal CTA Strip', enabled: true, title: 'Candidate Workspace', text: 'Track exam deadlines, saved posts, and CBT scores in one dashboard.', label: 'Open Dashboard', url: '/student-dashboard/' },
      { id: 'community-callout', name: 'Telegram/WhatsApp Community Callout', enabled: true, title: 'Odisha Aspirant Community', text: 'Join daily current affairs & instant job alert channels.', label: 'Join Community', url: '/community/' },
      { id: 'footer-notice', name: 'Footer Statutory Notice', enabled: true, title: 'Disclaimer', text: 'Common Sense Odisha is an independent educational portal. Verify official dates on commission websites.', label: 'Read Disclaimer', url: '/disclaimer.html' }
    ];

    var sections = [];
    var bannerState = { active: false, severity: 'info', headline: '', context: '', ctaText: '', ctaUrl: '' };

    function renderCards() {
      clear(grid);

      // Card 1: Broadcast Banner (/api/admin/banner)
      var bChk = el('input', { type: 'checkbox' }); bChk.checked = !!bannerState.active;
      var bSev = el('select', { class: 'cso-mod-select' }, ['info', 'notice', 'urgent'].map(function (s) { return el('option', { value: s, text: s, selected: bannerState.severity === s }); }));
      var bHead = el('input', { type: 'text', class: 'cso-mod-input', value: bannerState.headline || '' });
      var bUrl = el('input', { type: 'text', class: 'cso-mod-input', value: bannerState.ctaUrl || '' });
      grid.appendChild(el('div', { class: 'cso-mod-card' }, [
        el('div', { class: 'cso-drawer-head' }, [el('h3', { text: 'Broadcast Banner' }), badge('/api/admin/banner', 'info')]),
        el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-check-label' }, [bChk, el('span', { text: 'Active across homepage & portals' })])]),
        el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Severity' }), bSev]),
        el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Headline' }), bHead]),
        el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'CTA URL' }), bUrl]),
        el('button', {
          type: 'button',
          class: 'cso-mod-btn cso-mod-btn-primary cso-mod-btn-sm',
          text: 'Save Broadcast Banner',
          onclick: async function () {
            try {
              await api('PUT', 'banner', { active: bChk.checked, severity: bSev.value, headline: bHead.value.trim(), context: bannerState.context || '', ctaText: bannerState.ctaText || 'View', ctaUrl: bUrl.value.trim() });
              toast('Broadcast Banner saved live!', 'success');
            } catch (e) { toast(e.message, 'crimson'); }
          }
        })
      ]));

      // Cards 2-4: /__sitewide sections
      sections.forEach(function (sec) {
        var chk = el('input', { type: 'checkbox' }); chk.checked = sec.enabled !== false;
        var tInp = el('input', { type: 'text', class: 'cso-mod-input', value: sec.title || '' });
        var txtInp = el('textarea', { class: 'cso-mod-textarea' }); txtInp.value = sec.text || '';
        var lblInp = el('input', { type: 'text', class: 'cso-mod-input', value: sec.label || '' });
        var urlInp = el('input', { type: 'text', class: 'cso-mod-input', value: sec.url || '' });

        chk.addEventListener('change', function () { sec.enabled = chk.checked; });
        tInp.addEventListener('input', function () { sec.title = tInp.value; });
        txtInp.addEventListener('input', function () { sec.text = txtInp.value; });
        lblInp.addEventListener('input', function () { sec.label = lblInp.value; });
        urlInp.addEventListener('input', function () { sec.url = urlInp.value; });

        grid.appendChild(el('div', { class: 'cso-mod-card' }, [
          el('div', { class: 'cso-drawer-head' }, [el('h3', { text: sec.name || sec.id }), badge(sec.id, 'ok')]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-check-label' }, [chk, el('span', { text: 'Inject on public pages' })])]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Title' }), tInp]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Body Copy' }), txtInp]),
          el('div', { class: 'cso-mod-grid-2' }, [
            el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Link Label' }), lblInp]),
            el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Link URL' }), urlInp])
          ])
        ]));
      });
    }

    async function saveSitewide() {
      try {
        await api('PUT', 'pages', {
          route: '/__sitewide',
          title: 'Sitewide Reusable Sections',
          status: 'published',
          reusable_sections_json: JSON.stringify(sections),
          note: 'Updated reusable sitewide sections'
        });
        toast('Sitewide sections published live!', 'success');
      } catch (e) {
        toast(e.message, 'crimson');
      }
    }

    async function loadSitewide() {
      try {
        var [sw, b] = await Promise.all([api('GET', 'pages/sitewide'), api('GET', 'banner')]);
        bannerState = b || bannerState;
        var saved = Array.isArray(sw.sections) && sw.sections.length ? sw.sections : [];
        sections = DEFAULT_SECTIONS.map(function (def) {
          var match = saved.find(function (x) { return x.id === def.id; });
          return match ? Object.assign({}, def, match) : Object.assign({}, def);
        });
        renderCards();
      } catch (e) {
        sections = DEFAULT_SECTIONS.map(function (d) { return Object.assign({}, d); });
        renderCards();
        toast(e.message, 'crimson');
      }
    }

    renderBanner(shell, 'Reusable Sections', 'Edit shared sitewide strips injected across public pages via /__sitewide & /api/admin/banner.', [
      el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-primary', text: 'Publish All Sitewide Sections Live', onclick: saveSitewide }),
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'Reload', onclick: loadSitewide })
    ]);
    shell.appendChild(grid);
    root.appendChild(shell);
    loadSitewide();
  }

  /* -------------------------------------------------------------------------
     02-008: Page Revisions (site_page_revisions + /api/admin/audit + Diff)
     ------------------------------------------------------------------------- */
  function renderPageRevisionsStudio(root, actions) {
    addHeaderPill(actions, '● Page Revisions');
    var shell = el('div', { class: 'cso-mod-shell' });
    var routeSel = el('select', { class: 'cso-mod-select' });
    var revHost = el('div', {});
    var diffHost = el('div', {});
    var auditHost = el('div', {});
    var pagesByRoute = {};

    function showDiff(rev) {
      clear(diffHost);
      var snap = {};
      try { snap = JSON.parse(rev.snapshot_json || '{}'); } catch (_) {}
      var cur = pagesByRoute[rev.route] || {};
      var fields = [
        ['Title', cur.title || '', snap.title || ''],
        ['Status', cur.status || 'published', snap.status || ''],
        ['Meta Description', cur.meta_description || '', snap.meta_description || ''],
        ['Hero Title', cur.hero_title || '', snap.hero_title || ''],
        ['CTA Label', cur.cta_label || '', snap.cta_label || ''],
        ['Blocks Count', String(f02ParseBlocks(cur.blocks_json).length), String(f02ParseBlocks(snap.blocks_json).length)]
      ];

      var curCol = el('div', { class: 'cso-diff-col' }, [el('h4', { text: 'Current Live State' })]);
      var revCol = el('div', { class: 'cso-diff-col' }, [el('h4', { text: 'Revision #' + rev.id + ' (' + (rev.created_at || '') + ')' })]);
      fields.forEach(function (f) {
        var changed = f[1] !== f[2];
        curCol.appendChild(el('div', { class: 'cso-diff-row' + (changed ? ' cso-diff-changed' : ''), text: f[0] + ': ' + (f[1] || '—') }));
        revCol.appendChild(el('div', { class: 'cso-diff-row' + (changed ? ' cso-diff-changed' : ''), text: f[0] + ': ' + (f[2] || '—') }));
      });

      diffHost.appendChild(el('div', { class: 'cso-drawer' }, [
        el('div', { class: 'cso-drawer-head' }, [
          el('strong', { text: 'Side-by-Side Diff — ' + rev.route }),
          el('div', { class: 'cso-mod-toolbar' }, [
            el('button', {
              type: 'button',
              class: 'cso-mod-btn cso-mod-btn-primary cso-mod-btn-sm',
              text: 'Restore Version Live',
              onclick: async function () {
                try {
                  await api('POST', 'pages/restore', { route: rev.route, revision_id: rev.id, status: 'published' });
                  toast('Restored revision #' + rev.id + ' live!', 'success');
                  await loadRevisions(rev.route);
                } catch (e) { toast(e.message, 'crimson'); }
              }
            }),
            el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Close Diff', onclick: function () { clear(diffHost); } })
          ])
        ]),
        el('div', { class: 'cso-diff-grid' }, [curCol, revCol])
      ]));
    }

    async function loadRevisions(route) {
      clear(revHost);
      clear(diffHost);
      if (!route) return;
      revHost.appendChild(el('p', { class: 'cso-mod-muted', text: 'Loading snapshots for ' + route + '…' }));
      try {
        var d = await api('GET', 'pages/revisions?route=' + encodeURIComponent(route));
        var revs = d.revisions || [];
        clear(revHost);
        if (!revs.length) {
          revHost.appendChild(el('p', { class: 'cso-mod-muted', text: 'No D1 snapshots recorded yet for ' + route + '. Edit and save the page to create its first revision.' }));
          return;
        }
        var rows = revs.map(function (r) {
          return el('tr', {}, [
            el('td', { text: '#' + r.id }),
            el('td', { text: r.editor_email || '—' }),
            el('td', { text: r.note || 'update' }),
            el('td', { text: r.created_at || '—' }),
            el('td', {}, el('div', { class: 'cso-mod-toolbar' }, [
              el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Compare Diff', onclick: function () { showDiff(r); } }),
              el('button', {
                type: 'button',
                class: 'cso-mod-btn cso-mod-btn-primary cso-mod-btn-sm',
                text: 'Restore Live',
                onclick: async function () {
                  try {
                    await api('POST', 'pages/restore', { route: r.route, revision_id: r.id, status: 'published' });
                    toast('Restored revision #' + r.id + ' live!', 'success');
                    loadRevisions(r.route);
                  } catch (e) { toast(e.message, 'crimson'); }
                }
              })
            ]))
          ]);
        });
        revHost.appendChild(safeTable(['Revision', 'Editor', 'Note', 'Timestamp', 'Actions'], rows));
      } catch (e) {
        clear(revHost);
        revHost.appendChild(el('p', { class: 'cso-mod-muted', text: e.message }));
      }
    }

    async function init() {
      try {
        var [pRes, aRes] = await Promise.all([api('GET', 'pages'), api('GET', 'audit?limit=25')]);
        var pages = (pRes.pages || []).sort(function (a, b) { return (b.revisions || 0) - (a.revisions || 0); });
        clear(routeSel);
        pages.forEach(function (p) {
          pagesByRoute[p.route] = p;
          routeSel.appendChild(el('option', { value: p.route, text: p.route + ' (' + (p.revisions || 0) + ' revisions)' }));
        });
        if (pages.length) loadRevisions(pages[0].route);

        var logs = (aRes.items || aRes.logs || []).filter(function (x) { return String(x.action || '').indexOf('page.') === 0 || String(x.action || '').indexOf('banner.') === 0; });
        clear(auditHost);
        if (logs.length) {
          var aRows = logs.slice(0, 12).map(function (l) {
            return el('tr', {}, [
              el('td', { text: l.action || '—' }),
              el('td', { text: l.target_id || l.entity_id || '—' }),
              el('td', { text: l.actor_email || '—' }),
              el('td', { text: l.created_at || '—' })
            ]);
          });
          auditHost.appendChild(safeTable(['Action', 'Route / Key', 'Actor', 'Time'], aRows));
        } else {
          auditHost.appendChild(el('p', { class: 'cso-mod-muted', text: 'No recent page audit events.' }));
        }
      } catch (e) {
        toast(e.message, 'crimson');
      }
    }

    routeSel.addEventListener('change', function () { loadRevisions(routeSel.value); });
    renderBanner(shell, 'Page Revisions & Rollback', 'Inspect D1 site_page_revisions snapshots, compare side-by-side diffs, and restore any version live.', [
      routeSel,
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'Refresh', onclick: init })
    ]);
    shell.appendChild(diffHost);
    shell.appendChild(el('div', { class: 'cso-mod-card' }, [el('h3', { text: 'Page Snapshots' }), revHost]));
    shell.appendChild(el('div', { class: 'cso-mod-card' }, [el('h3', { text: 'Recent Page & Banner Audit Events' }), auditHost]));
    root.appendChild(shell);
    init();
  }

  /* -------------------------------------------------------------------------
     02-009: Drafts & Previews (Unified draft pages + content queue)
     ------------------------------------------------------------------------- */
  function renderDraftsAndPreviewsStudio(root, actions) {
    addHeaderPill(actions, '● Drafts & Previews');
    var shell = el('div', { class: 'cso-mod-shell' });
    var previewHost = el('div', {});
    var tableHost = el('div', {});

    function showDraftPreview(entry) {
      clear(previewHost);
      var mobile = false;
      if (entry.kind === 'page') {
        var frame = el('iframe', { src: entry.route + '?preview=1&t=' + Date.now(), class: 'cso-preview-frame', title: 'Draft Preview' });
        var tBtn = el('button', {
          type: 'button',
          class: 'cso-mod-btn cso-mod-btn-sm',
          text: 'Mobile 375px',
          onclick: function () {
            mobile = !mobile;
            frame.className = mobile ? 'cso-preview-frame-mobile' : 'cso-preview-frame';
            tBtn.textContent = mobile ? 'Desktop 100%' : 'Mobile 375px';
          }
        });
        previewHost.appendChild(el('div', { class: 'cso-drawer' }, [
          el('div', { class: 'cso-drawer-head' }, [
            el('strong', { text: 'Draft Preview — ' + entry.route }),
            el('div', { class: 'cso-mod-toolbar' }, [
              tBtn,
              el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Close', onclick: function () { clear(previewHost); } })
            ])
          ]),
          el('div', { class: 'cso-preview-frame-wrap' }, [frame])
        ]));
      } else {
        previewHost.appendChild(el('div', { class: 'cso-drawer' }, [
          el('div', { class: 'cso-drawer-head' }, [
            el('strong', { text: 'Draft Preview — ' + entry.title }),
            el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Close', onclick: function () { clear(previewHost); } })
          ]),
          el('p', { class: 'cso-mod-muted', text: entry.summary || 'No summary provided.' })
        ]));
      }
    }

    async function loadDrafts() {
      clear(tableHost);
      tableHost.appendChild(el('p', { class: 'cso-mod-muted', text: 'Loading draft pages & content from D1…' }));
      try {
        var [pRes, ca, jobs, tests] = await Promise.all([
          api('GET', 'pages'),
          api('GET', 'current-affairs?limit=50'),
          api('GET', 'jobs?limit=50'),
          api('GET', 'mock-tests?limit=50')
        ]);
        var items = [];
        (pRes.pages || []).forEach(function (p) {
          if (p.status === 'draft') items.push({ kind: 'page', label: 'Page', route: p.route, title: p.title || p.route, updated_at: p.updated_at });
        });
        [['current-affairs', 'Current Affairs', ca], ['jobs', 'Job Alert', jobs], ['mock-tests', 'Mock Test', tests]].forEach(function (g) {
          (g[2].items || []).forEach(function (x) {
            if (x.status === 'draft') items.push({ kind: g[0], label: g[1], id: x.id, title: x.title || x.slug || x.id, summary: x.summary || x.description || '', updated_at: x.updated_at });
          });
        });

        clear(tableHost);
        if (!items.length) {
          tableHost.appendChild(el('p', { class: 'cso-mod-muted', text: 'All pages and content items are published — 0 drafts pending.' }));
          return;
        }
        var rows = items.map(function (it) {
          return el('tr', {}, [
            el('td', {}, badge(it.label, 'info')),
            el('td', { text: it.title + (it.route ? ' (' + it.route + ')' : '') }),
            el('td', { text: it.updated_at || '—' }),
            el('td', {}, el('div', { class: 'cso-mod-toolbar' }, [
              el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Preview', onclick: function () { showDraftPreview(it); } }),
              el('button', {
                type: 'button',
                class: 'cso-mod-btn cso-mod-btn-primary cso-mod-btn-sm',
                text: 'Publish Live Now',
                onclick: async function () {
                  try {
                    if (it.kind === 'page') await api('PUT', 'pages', { route: it.route, status: 'published', note: 'Published from Drafts' });
                    else await api('POST', it.kind + '/' + encodeURIComponent(it.id) + '/status', { status: 'published' });
                    toast('Published live: ' + it.title, 'success');
                    loadDrafts();
                  } catch (e) { toast(e.message, 'crimson'); }
                }
              })
            ]))
          ]);
        });
        tableHost.appendChild(safeTable(['Type', 'Title / Route', 'Last Updated', 'Actions'], rows));
      } catch (e) {
        clear(tableHost);
        tableHost.appendChild(el('p', { class: 'cso-mod-muted', text: e.message }));
      }
    }

    renderBanner(shell, 'Drafts & Previews', 'Unified draft queue for Website Pages & D1 content with Desktop/Mobile preview and one-click publish.', [
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'Refresh Queue', onclick: loadDrafts })
    ]);
    shell.appendChild(previewHost);
    shell.appendChild(el('div', { class: 'cso-mod-card' }, [tableHost]));
    root.appendChild(shell);
    loadDrafts();
  }

  /* -------------------------------------------------------------------------
     02-010: Scheduled Pages (Countdowns + Inline Reschedule + Publish Now)
     ------------------------------------------------------------------------- */
  function renderScheduledPagesStudio(root, actions) {
    addHeaderPill(actions, '● Scheduled Queue');
    var shell = el('div', { class: 'cso-mod-shell' });
    var tableHost = el('div', {});

    function formatCountdown(iso) {
      if (!iso) return 'No date';
      var diff = new Date(iso).getTime() - Date.now();
      if (isNaN(diff)) return iso;
      if (diff <= 0) return 'Due now';
      var mins = Math.floor(diff / 60000);
      var d = Math.floor(mins / 1440);
      var h = Math.floor((mins % 1440) / 60);
      var m = mins % 60;
      return d + 'd ' + h + 'h ' + m + 'm';
    }

    async function loadScheduled() {
      clear(tableHost);
      try {
        var [pRes, ca, jobs, tests] = await Promise.all([
          api('GET', 'pages'),
          api('GET', 'current-affairs?limit=50'),
          api('GET', 'jobs?limit=50'),
          api('GET', 'mock-tests?limit=50')
        ]);
        var items = [];
        (pRes.pages || []).forEach(function (p) {
          if (p.status === 'scheduled') items.push({ kind: 'page', label: 'Page', route: p.route, title: p.title || p.route, publish_at: p.publish_at });
        });
        [['current-affairs', 'Current Affairs', ca], ['jobs', 'Job Alert', jobs], ['mock-tests', 'Mock Test', tests]].forEach(function (g) {
          (g[2].items || []).forEach(function (x) {
            if (x.status === 'scheduled') items.push({ kind: g[0], label: g[1], id: x.id, title: x.title || x.slug || x.id, publish_at: x.publish_at || x.updated_at });
          });
        });

        if (!items.length) {
          tableHost.appendChild(el('p', { class: 'cso-mod-muted', text: 'No scheduled pages or posts in queue.' }));
          return;
        }
        var rows = items.map(function (it) {
          var dtInp = el('input', { type: 'datetime-local', class: 'cso-mod-input' });
          if (it.publish_at) {
            var dt = new Date(it.publish_at);
            if (!isNaN(dt.getTime())) dtInp.value = dt.toISOString().slice(0, 16);
          }
          return el('tr', {}, [
            el('td', {}, badge(it.label, 'warn')),
            el('td', { text: it.title + (it.route ? ' (' + it.route + ')' : '') }),
            el('td', {}, badge(formatCountdown(it.publish_at), 'info')),
            el('td', {}, it.kind === 'page' ? el('div', { class: 'cso-inline-row' }, [
              dtInp,
              el('button', {
                type: 'button',
                class: 'cso-mod-btn cso-mod-btn-sm',
                text: 'Reschedule',
                onclick: async function () {
                  if (!dtInp.value) return;
                  try {
                    await api('PUT', 'pages', { route: it.route, status: 'scheduled', publish_at: new Date(dtInp.value).toISOString(), note: 'Rescheduled' });
                    toast('Rescheduled: ' + it.route, 'success');
                    loadScheduled();
                  } catch (e) { toast(e.message, 'crimson'); }
                }
              })
            ]) : el('span', { class: 'cso-mod-muted', text: it.publish_at || '—' })),
            el('td', {}, el('button', {
              type: 'button',
              class: 'cso-mod-btn cso-mod-btn-primary cso-mod-btn-sm',
              text: 'Publish Immediately',
              onclick: async function () {
                try {
                  if (it.kind === 'page') await api('PUT', 'pages', { route: it.route, status: 'published', publish_at: null, note: 'Published immediately' });
                  else await api('POST', it.kind + '/' + encodeURIComponent(it.id) + '/status', { status: 'published' });
                  toast('Published immediately: ' + it.title, 'success');
                  loadScheduled();
                } catch (e) { toast(e.message, 'crimson'); }
              }
            }))
          ]);
        });
        tableHost.appendChild(safeTable(['Type', 'Title / Route', 'Countdown', 'Reschedule', 'Action'], rows));
      } catch (e) {
        tableHost.appendChild(el('p', { class: 'cso-mod-muted', text: e.message }));
      }
    }

    renderBanner(shell, 'Scheduled Pages', 'Live scheduled publication queue with countdowns, inline rescheduler, and immediate publish.', [
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'Refresh', onclick: loadScheduled })
    ]);
    shell.appendChild(el('div', { class: 'cso-mod-card' }, [tableHost]));
    root.appendChild(shell);
    loadScheduled();
  }

  /* -------------------------------------------------------------------------
     02-011: Trash & Restore (Archived/Trash vault + Bulk Restore)
     ------------------------------------------------------------------------- */
  function renderTrashAndRestoreStudio(root, actions) {
    addHeaderPill(actions, '● Trash & Restore');
    var shell = el('div', { class: 'cso-mod-shell' });
    var tableHost = el('div', {});
    var selected = [];

    async function bulkRestore(targetStatus) {
      if (!selected.length) { toast('Select at least one item to restore', 'crimson'); return; }
      try {
        for (var i = 0; i < selected.length; i++) {
          var it = selected[i];
          if (it.kind === 'page') await api('POST', 'pages/restore', { route: it.route, status: targetStatus });
          else await api('POST', it.kind + '/' + encodeURIComponent(it.id) + '/status', { status: targetStatus });
        }
        toast('Restored ' + selected.length + ' item(s) to ' + targetStatus, 'success');
        selected = [];
        loadTrash();
      } catch (e) {
        toast(e.message, 'crimson');
      }
    }

    async function loadTrash() {
      clear(tableHost);
      selected = [];
      try {
        var [pRes, ca, jobs, tests] = await Promise.all([
          api('GET', 'pages'),
          api('GET', 'current-affairs?limit=50'),
          api('GET', 'jobs?limit=50'),
          api('GET', 'mock-tests?limit=50')
        ]);
        var items = [];
        (pRes.pages || []).forEach(function (p) {
          if (p.status === 'trash' || p.status === 'archived') items.push({ kind: 'page', label: 'Page', route: p.route, title: p.title || p.route, status: p.status, updated_at: p.updated_at });
        });
        [['current-affairs', 'Current Affairs', ca], ['jobs', 'Job Alert', jobs], ['mock-tests', 'Mock Test', tests]].forEach(function (g) {
          (g[2].items || []).forEach(function (x) {
            if (x.status === 'trash' || x.status === 'archived') items.push({ kind: g[0], label: g[1], id: x.id, title: x.title || x.slug || x.id, status: x.status, updated_at: x.updated_at });
          });
        });

        if (!items.length) {
          tableHost.appendChild(el('p', { class: 'cso-mod-muted', text: 'Trash & archive vault is empty.' }));
          return;
        }
        var rows = items.map(function (it) {
          var chk = el('input', { type: 'checkbox' });
          chk.addEventListener('change', function () {
            if (chk.checked) selected.push(it);
            else selected = selected.filter(function (x) { return x !== it; });
          });
          return el('tr', {}, [
            el('td', {}, chk),
            el('td', {}, badge(it.label, 'danger')),
            el('td', { text: it.title + (it.route ? ' (' + it.route + ')' : '') }),
            el('td', {}, f02StatusBadge(it.status)),
            el('td', {}, el('div', { class: 'cso-mod-toolbar' }, [
              el('button', {
                type: 'button',
                class: 'cso-mod-btn cso-mod-btn-sm',
                text: 'Restore to Draft',
                onclick: async function () {
                  try {
                    if (it.kind === 'page') await api('POST', 'pages/restore', { route: it.route, status: 'draft' });
                    else await api('POST', it.kind + '/' + encodeURIComponent(it.id) + '/status', { status: 'draft' });
                    toast('Restored to draft: ' + it.title, 'success');
                    loadTrash();
                  } catch (e) { toast(e.message, 'crimson'); }
                }
              }),
              el('button', {
                type: 'button',
                class: 'cso-mod-btn cso-mod-btn-primary cso-mod-btn-sm',
                text: 'Re-Publish Live',
                onclick: async function () {
                  try {
                    if (it.kind === 'page') await api('POST', 'pages/restore', { route: it.route, status: 'published' });
                    else await api('POST', it.kind + '/' + encodeURIComponent(it.id) + '/status', { status: 'published' });
                    toast('Re-published live: ' + it.title, 'success');
                    loadTrash();
                  } catch (e) { toast(e.message, 'crimson'); }
                }
              })
            ]))
          ]);
        });
        tableHost.appendChild(safeTable(['', 'Type', 'Title / Route', 'State', 'Actions'], rows));
      } catch (e) {
        tableHost.appendChild(el('p', { class: 'cso-mod-muted', text: e.message }));
      }
    }

    renderBanner(shell, 'Trash & Restore Vault', 'Recover archived or trashed pages and content to Draft or Live with single or bulk restore.', [
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'Bulk Restore to Draft', onclick: function () { bulkRestore('draft'); } }),
      el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-primary', text: 'Bulk Re-Publish Live', onclick: function () { bulkRestore('published'); } }),
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'Refresh', onclick: loadTrash })
    ]);
    shell.appendChild(el('div', { class: 'cso-mod-card' }, [tableHost]));
    root.appendChild(shell);
    loadTrash();
  }

  function renderFolder02(folderId, moduleId, root, actions) {
    if (moduleId === 'module-02-001') { renderAllPagesStudio(root, actions); return true; }
    if (moduleId === 'module-02-002') { renderCreatePageWizard(root, actions); return true; }
    if (moduleId === 'module-02-003') { renderVisualPageBuilder(root, actions); return true; }
    if (moduleId === 'module-02-004') { renderHomepageBuilder(root, actions); return true; }
    if (moduleId === 'module-02-005') { renderLandingPagesStudio(root, actions); return true; }
    if (moduleId === 'module-02-006') { renderPageTemplatesGallery(root, actions); return true; }
    if (moduleId === 'module-02-007') { renderReusableSectionsStudio(root, actions); return true; }
    if (moduleId === 'module-02-008') { renderPageRevisionsStudio(root, actions); return true; }
    if (moduleId === 'module-02-009') { renderDraftsAndPreviewsStudio(root, actions); return true; }
    if (moduleId === 'module-02-010') { renderScheduledPagesStudio(root, actions); return true; }
    if (moduleId === 'module-02-011') { renderTrashAndRestoreStudio(root, actions); return true; }
    return false;
  }

  /* =========================================================================
     FOLDER 03: WEBSITE INFORMATION & LEGAL (module-03-001..016)
     ========================================================================= */
  var LEGAL_PAGES = {
    'module-03-001': { title: 'About Us', path: '/about.html', email: 'editorial@csodisha.com' },
    'module-03-002': { title: 'Contact Us', path: '/contact.html', email: 'support@csodisha.com' },
    'module-03-003': { title: 'Privacy Policy', path: '/privacy.html', email: 'privacy@csodisha.com' },
    'module-03-004': { title: 'Disclaimer', path: '/disclaimer.html', email: 'legal@csodisha.com' },
    'module-03-005': { title: 'Terms & Conditions', path: '/terms.html', email: 'legal@csodisha.com' },
    'module-03-006': { title: 'Cookie Policy', path: '/cookies.html', email: 'privacy@csodisha.com' },
    'module-03-007': { title: 'Copyright & DMCA', path: '/copyright.html', email: 'dmca@csodisha.com' },
    'module-03-008': { title: 'Editorial Policy', path: '/editorial-policy.html', email: 'editorial@csodisha.com' },
    'module-03-009': { title: 'Corrections Policy', path: '/corrections.html', email: 'editorial@csodisha.com' },
    'module-03-010': { title: 'Accessibility Statement', path: '/accessibility.html', email: 'accessibility@csodisha.com' },
    'module-03-011': { title: 'Refund & Cancellation Policy', path: '/refund.html', email: 'billing@csodisha.com' },
    'module-03-012': { title: 'Digital Delivery Policy', path: '/delivery.html', email: 'support@csodisha.com' },
    'module-03-013': { title: 'Community Guidelines', path: '/community-guidelines.html', email: 'community@csodisha.com' },
    'module-03-014': { title: 'Frequently Asked Questions', path: '/faq.html', email: 'support@csodisha.com' },
    'module-03-015': { title: 'Custom Information Pages', path: '/about.html', email: 'editorial@csodisha.com' },
    'module-03-016': { title: 'Legal Page Revision History', path: '/privacy.html', email: 'legal@csodisha.com' }
  };

  function renderLegalStudio(moduleId, root, actions) {
    var cfg = LEGAL_PAGES[moduleId] || { title: 'Legal Document', path: '/privacy.html', email: 'legal@csodisha.com' };
    addHeaderPill(actions, '● Live Legal & Info Publisher');

    var shell = el('div', { class: 'cso-mod-shell' });
    var routeInp = el('input', { type: 'text', class: 'cso-mod-input', value: cfg.path });
    var titleInp = el('input', { type: 'text', class: 'cso-mod-input', value: cfg.title });
    var metaInp = el('textarea', { class: 'cso-mod-textarea', placeholder: 'SEO Meta Description (up to 160 chars)…' });
    var heroTitleInp = el('input', { type: 'text', class: 'cso-mod-input', value: cfg.title });
    var heroSubInp = el('input', { type: 'text', class: 'cso-mod-input', value: 'Official policy & transparency information for Common Sense Odisha.' });
    var dateInp = el('input', { type: 'date', class: 'cso-mod-input', value: new Date().toISOString().slice(0, 10) });
    var statusSel = el('select', { class: 'cso-mod-select' }, [
      el('option', { value: 'published', text: 'published' }),
      el('option', { value: 'draft', text: 'draft' })
    ]);

    var sections = [
      { type: 'notice', title: 'Effective Date & Contact', text: 'Effective: ' + new Date().toISOString().slice(0, 10) + ' · Contact: ' + cfg.email },
      { type: 'richtext', title: 'Policy Overview', text: 'Common Sense Odisha (csodisha.com) maintains transparent editorial, accessibility, and DPDP-aligned standards.' }
    ];
    var sectionsHost = el('div', { class: 'cso-mod-shell' });
    var revHost = el('div', {});
    var liveLink = el('a', { href: cfg.path, target: '_blank', rel: 'noopener noreferrer', class: 'cso-mod-btn', text: 'Open Live ↗' });
    var frame = el('iframe', { src: cfg.path + '?preview=1&t=' + Date.now(), class: 'cso-preview-frame', title: 'Live Legal Preview' });

    function refreshFrame() {
      var r = f02NormalizeRoute(routeInp.value || cfg.path);
      liveLink.setAttribute('href', r);
      frame.src = r + '?preview=1&t=' + Date.now();
    }

    function renderSections() {
      clear(sectionsHost);
      sections.forEach(function (sec, idx) {
        var sTitle = el('input', { type: 'text', class: 'cso-mod-input', value: sec.title || '', placeholder: 'Section Heading' });
        var sText = el('textarea', { class: 'cso-mod-textarea', placeholder: 'Section content…' });
        sText.value = sec.text || '';
        sTitle.addEventListener('input', function () { sec.title = sTitle.value; });
        sText.addEventListener('input', function () { sec.text = sText.value; });
        sectionsHost.appendChild(el('div', { class: 'cso-builder-block' }, [
          el('div', { class: 'cso-builder-block-head' }, [
            badge((idx + 1) + '. ' + sec.type, 'info'),
            el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-danger cso-mod-btn-sm', text: '✕', onclick: function () { sections.splice(idx, 1); renderSections(); } })
          ]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Section Title' }), sTitle]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Section Content' }), sText])
        ]));
      });
    }

    async function loadLive() {
      var targetRoute = f02NormalizeRoute(routeInp.value || cfg.path);
      try {
        var [pRes, revRes] = await Promise.all([
          api('GET', 'pages'),
          api('GET', 'pages/revisions?route=' + encodeURIComponent(targetRoute)).catch(function () { return { revisions: [] }; })
        ]);
        var match = (pRes.pages || []).find(function (p) { return p.route === targetRoute || p.route === cfg.path; });
        if (match) {
          titleInp.value = match.title || cfg.title;
          metaInp.value = match.meta_description || '';
          heroTitleInp.value = match.hero_title || match.title || cfg.title;
          heroSubInp.value = match.hero_subtitle || '';
          statusSel.value = match.status === 'draft' ? 'draft' : 'published';
          var parsed = f02ParseBlocks(match.blocks_json);
          if (parsed.length) sections = parsed;
        }
        renderSections();
        clear(revHost);
        var revs = revRes.revisions || [];
        if (revs.length) {
          revHost.appendChild(safeTable(['Rev', 'Editor', 'Note', 'Time', 'Restore'], revs.slice(0, 6).map(function (rv) {
            return el('tr', {}, [
              el('td', { text: '#' + rv.id }),
              el('td', { text: rv.editor_email || '—' }),
              el('td', { text: rv.note || 'update' }),
              el('td', { text: rv.created_at || '—' }),
              el('td', {}, el('button', {
                type: 'button',
                class: 'cso-mod-btn cso-mod-btn-primary cso-mod-btn-sm',
                text: 'Restore Live',
                onclick: async function () {
                  try {
                    await api('POST', 'pages/restore', { route: targetRoute, revision_id: rv.id, status: 'published' });
                    toast('Restored revision #' + rv.id + ' live!', 'success');
                    await loadLive();
                    refreshFrame();
                  } catch (e) { toast(e.message, 'crimson'); }
                }
              }))
            ]);
          })));
        } else {
          revHost.appendChild(el('p', { class: 'cso-mod-muted', text: 'No D1 revisions saved yet for ' + targetRoute + '.' }));
        }
      } catch (e) {
        toast(e.message, 'crimson');
      }
    }

    async function publishLegal(targetStatus) {
      var targetRoute = f02NormalizeRoute(routeInp.value || cfg.path);
      if (sections[0] && sections[0].type === 'notice' && dateInp.value) {
        sections[0].title = 'Effective Date: ' + dateInp.value;
      }
      try {
        await api('PUT', 'pages', {
          route: targetRoute,
          title: titleInp.value.trim() || cfg.title,
          meta_description: metaInp.value.trim(),
          category: 'Information & Legal',
          hero_title: heroTitleInp.value.trim(),
          hero_subtitle: heroSubInp.value.trim(),
          blocks_json: JSON.stringify(sections),
          status: targetStatus,
          note: 'Legal & Info Studio (' + moduleId + ')'
        });
        statusSel.value = targetStatus;
        toast((targetStatus === 'published' ? 'Published live: ' : 'Saved draft: ') + targetRoute, 'success');
        refreshFrame();
        loadLive();
      } catch (e) {
        toast(e.message, 'crimson');
      }
    }

    renderBanner(shell, cfg.title + ' — Live D1 & Edge Studio', 'Edit SEO, Hero, Effective Date, and structured sections for ' + cfg.path + ' and publish live via HTMLRewriter.', [
      el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-primary', text: 'Publish Live to Website', onclick: function () { publishLegal('published'); } }),
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'Save Draft', onclick: function () { publishLegal('draft'); } }),
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'Refresh Preview', onclick: refreshFrame }),
      liveLink
    ]);

    shell.appendChild(el('div', { class: 'cso-mod-grid-2' }, [
      el('div', { class: 'cso-mod-shell' }, [
        el('div', { class: 'cso-mod-card' }, [
          el('h3', { text: 'SEO, Hero & Effective Date' }),
          el('div', { class: 'cso-mod-grid-2' }, [
            el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Public Route' }), routeInp]),
            el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Status' }), statusSel])
          ]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'SEO Title' }), titleInp]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Meta Description' }), metaInp]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Hero Headline' }), heroTitleInp]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Hero Subheadline' }), heroSubInp]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Last-Updated Effective Date' }), dateInp])
        ]),
        el('div', { class: 'cso-mod-card' }, [
          el('div', { class: 'cso-drawer-head' }, [
            el('h3', { text: 'Structured Policy / Info Sections' }),
            el('div', { class: 'cso-mod-toolbar' }, [
              el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: '+ Notice', onclick: function () { sections.push({ type: 'notice', title: 'Notice', text: '' }); renderSections(); } }),
              el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: '+ Rich Text', onclick: function () { sections.push({ type: 'richtext', title: 'Section', text: '' }); renderSections(); } })
            ])
          ]),
          sectionsHost
        ])
      ]),
      el('div', { class: 'cso-mod-shell' }, [
        el('div', { class: 'cso-mod-card' }, [
          el('div', { class: 'cso-drawer-head' }, [el('h3', { text: 'Live Public Route Preview' }), badge('iframe', 'info')]),
          el('div', { class: 'cso-preview-frame-wrap' }, [frame])
        ]),
        el('div', { class: 'cso-mod-card' }, [
          el('h3', { text: 'Revision History & One-Click Restore' }),
          revHost
        ])
      ])
    ]));

    root.appendChild(shell);
    renderSections();
    loadLive();
    return true;
  }

  /* =========================================================================
     FOLDER 04: CONTENT & PUBLISHING (module-04-001..014)
     ========================================================================= */
  function renderFolder04(moduleId, root, actions) {
    if (moduleId === 'module-04-007' || moduleId === 'module-04-008') {
      addHeaderPill(actions, '● Live D1 Taxonomy');
      var shell = el('div', { class: 'cso-mod-shell' });
      var host = el('div', {});
      renderBanner(shell, moduleId === 'module-04-007' ? 'Content Categories (Live D1)' : 'Tags & Topic Distribution (Live D1)', 'Computed directly from live Current Affairs and Job Alert records in D1.');
      shell.appendChild(host);
      root.appendChild(shell);
      Promise.all([api('GET', 'current-affairs?limit=100'), api('GET', 'jobs?limit=100')]).then(function (res) {
        var counts = {};
        var isTags = moduleId === 'module-04-008';
        [].concat(res[0].items || [], res[1].items || []).forEach(function (item) {
          if (isTags) {
            String(item.tags || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean).forEach(function (t) { counts[t] = (counts[t] || 0) + 1; });
          } else {
            var c = item.category || 'Uncategorized';
            counts[c] = (counts[c] || 0) + 1;
          }
        });
        var rows = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; }).map(function (k) {
          return el('tr', {}, [el('td', { text: k }), el('td', {}, badge(String(counts[k]) + ' items', 'info'))]);
        });
        host.appendChild(safeTable([isTags ? 'Tag' : 'Category', 'Live Count'], rows));
      }).catch(function (e) { host.appendChild(el('p', { class: 'cso-mod-muted', text: e.message })); });
      return true;
    }

    if (moduleId === 'module-04-009') {
      addHeaderPill(actions, '● Live Editorial Calendar');
      var shell2 = el('div', { class: 'cso-mod-shell' });
      var grid = el('div', { class: 'cso-cal-grid' });
      renderBanner(shell2, 'Editorial & Deadline Calendar', 'Upcoming scheduled posts and recruitment deadlines from D1.');
      shell2.appendChild(grid);
      root.appendChild(shell2);
      Promise.all([api('GET', 'current-affairs?limit=50'), api('GET', 'jobs?limit=50')]).then(function (res) {
        var events = [];
        (res[0].items || []).forEach(function (x) { events.push({ date: x.published_at || x.updated_at, title: x.title, type: 'Current Affairs', status: x.status }); });
        (res[1].items || []).forEach(function (x) { events.push({ date: x.deadline || x.published_at || x.updated_at, title: x.title, type: 'Job Deadline', status: x.status }); });
        events.sort(function (a, b) { return String(b.date || '').localeCompare(String(a.date || '')); });
        if (!events.length) { grid.appendChild(el('p', { class: 'cso-mod-muted', text: 'No scheduled or dated items in D1 yet.' })); return; }
        events.slice(0, 24).forEach(function (ev) {
          grid.appendChild(el('div', { class: 'cso-cal-cell' }, [
            badge(ev.type, ev.type === 'Job Deadline' ? 'warn' : 'info'),
            el('strong', { text: ev.title }),
            el('span', { class: 'cso-mod-muted', text: (ev.date || 'Unscheduled').slice(0, 16) })
          ]));
        });
      }).catch(function (e) { grid.appendChild(el('p', { class: 'cso-mod-muted', text: e.message })); });
      return true;
    }

    if (moduleId === 'module-04-010' || moduleId === 'module-04-011' || moduleId === 'module-04-012') {
      renderPendingApprovals(root, actions);
      return true;
    }

    if (moduleId === 'module-04-014') {
      addHeaderPill(actions, '● Bulk D1 Operations');
      var shell3 = el('div', { class: 'cso-mod-shell' });
      var host3 = el('div', {});
      var selected = new Set();
      var allItems = [];

      async function loadBulk() {
        clear(host3);
        var res = await api('GET', 'current-affairs?limit=100');
        allItems = res.items || [];
        var rows = allItems.map(function (it) {
          var chk = el('input', { type: 'checkbox' });
          chk.addEventListener('change', function () { if (chk.checked) selected.add(it.id); else selected.delete(it.id); });
          return el('tr', {}, [
            el('td', {}, chk),
            el('td', { text: it.title }),
            el('td', { text: it.category || '—' }),
            el('td', {}, badge(it.status, it.status === 'published' ? 'ok' : 'warn'))
          ]);
        });
        host3.appendChild(safeTable(['Select', 'Title', 'Category', 'Status'], rows));
      }

      async function bulkStatus(nextStatus) {
        if (!selected.size) { toast('Select at least one item', 'amber'); return; }
        for (var id of selected) {
          await api('POST', 'current-affairs/' + encodeURIComponent(id) + '/status', { status: nextStatus });
        }
        toast('Updated ' + selected.size + ' items to ' + nextStatus, 'success');
        selected.clear();
        loadBulk();
      }

      renderBanner(shell3, 'Bulk Content Operations', 'Multi-select live D1 posts to publish, archive, or export JSON.', [
        el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-primary', text: 'Bulk Publish', onclick: function () { bulkStatus('published'); } }),
        el('button', { type: 'button', class: 'cso-mod-btn', text: 'Bulk Draft', onclick: function () { bulkStatus('draft'); } }),
        el('button', { type: 'button', class: 'cso-mod-btn', text: 'Export JSON', onclick: function () { downloadFile('current-affairs-export.json', JSON.stringify(allItems, null, 2)); } })
      ]);
      shell3.appendChild(host3);
      root.appendChild(shell3);
      loadBulk().catch(function (e) { toast(e.message, 'crimson'); });
      return true;
    }

    return false;
  }

  /* =========================================================================
     FOLDER 06 & FOLDERS 20-23: NAVIGATION & CATEGORY TREE STUDIOS
     ========================================================================= */
  function renderCategoryTreeStudio(title, subtitle, root, actions) {
    addHeaderPill(actions, '● Live Manifest Tree');
    var shell = el('div', { class: 'cso-mod-shell' });
    var host = el('div', {});
    var nodes = [];

    function draw() {
      clear(host);
      var rows = nodes.map(function (n, idx) {
        return el('tr', {}, [
          el('td', { class: 'cso-tree-depth-' + Math.min(2, n.depth || 0), text: n.title }),
          el('td', { text: n.path || '/' }),
          el('td', {}, el('button', {
            type: 'button',
            class: 'cso-mod-btn cso-mod-btn-sm',
            text: '↑',
            onclick: function () { if (idx > 0) { var t = nodes[idx - 1]; nodes[idx - 1] = nodes[idx]; nodes[idx] = t; draw(); } }
          }))
        ]);
      });
      host.appendChild(safeTable(['Navigation / Category Node', 'Target Route', 'Order'], rows));
    }

    renderBanner(shell, title, subtitle, [
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'Export Tree JSON', onclick: function () { downloadFile('navigation-tree.json', JSON.stringify(nodes, null, 2)); } }),
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'Import Tree JSON', onclick: function () { pickJsonFile(function (d) { if (Array.isArray(d)) { nodes = d; draw(); } }); } })
    ]);
    shell.appendChild(host);
    root.appendChild(shell);

    fetchManifest().then(function (m) {
      var pages = m.pages || m.routes || [];
      nodes = pages.map(function (p, i) {
        var path = typeof p === 'string' ? p : (p.route || p.path || p.url || '/');
        var lbl = typeof p === 'string' ? p : (p.title || path);
        return { title: lbl, path: path, depth: path.split('/').filter(Boolean).length > 1 ? 1 : 0, order: i };
      });
      draw();
    }).catch(function (e) { host.appendChild(el('p', { class: 'cso-mod-muted', text: e.message })); });
    return true;
  }

  /* =========================================================================
     FOLDER 07: FILES, MEDIA & CLOUD (module-07-001..015)
     ========================================================================= */
  function renderFolder07(moduleId, root, actions) {
    if (moduleId === 'module-07-012' || moduleId === 'module-07-013' || moduleId === 'module-07-014') {
      addHeaderPill(actions, '● Live R2 Diagnostics');
      var shell = el('div', { class: 'cso-mod-shell' });
      var host = el('div', {});
      renderBanner(shell, 'R2 Storage & Asset Integrity', 'Computed live from Cloudflare R2 media_assets in D1.');
      shell.appendChild(host);
      root.appendChild(shell);
      api('GET', 'media?limit=200').then(function (d) {
        var items = d.items || [];
        var totalBytes = items.reduce(function (acc, x) { return acc + (Number(x.size_bytes) || 0); }, 0);
        var pdfs = items.filter(function (x) { return String(x.mime_type || '').includes('pdf'); }).length;
        var imgs = items.length - pdfs;
        host.appendChild(el('div', { class: 'cso-mod-grid-3' }, [
          kpiBox(String(items.length), 'Total R2 Objects'),
          kpiBox((totalBytes / (1024 * 1024)).toFixed(2) + ' MB', 'Total Storage Used'),
          kpiBox(pdfs + ' PDF / ' + imgs + ' Img', 'Asset Breakdown')
        ]));
        var rows = items.map(function (it) {
          return el('tr', {}, [
            el('td', { text: it.original_name || it.object_key }),
            el('td', { text: it.mime_type || '—' }),
            el('td', { text: Math.round((Number(it.size_bytes) || 0) / 1024) + ' KB' }),
            el('td', {}, el('a', { href: '/api/media/' + it.object_key, target: '_blank', rel: 'noopener noreferrer', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Open R2 ↗' }))
          ]);
        });
        host.appendChild(safeTable(['Filename', 'MIME Type', 'Size', 'Link'], rows));
      }).catch(function (e) { host.appendChild(el('p', { class: 'cso-mod-muted', text: e.message })); });
      return true;
    }
    return false;
  }

  /* =========================================================================
     FOLDER 11: COMMUNICATIONS & BROADCASTS
     ========================================================================= */
  function renderCommsStudio(moduleId, root, actions) {
    addHeaderPill(actions, '● Communications & Alerts');
    var shell = el('div', { class: 'cso-mod-shell' });
    var meta = moduleMeta('folder-11', moduleId);
    var tplName = el('input', { type: 'text', class: 'cso-mod-input', value: meta.title });
    var examVar = el('input', { type: 'text', class: 'cso-mod-input', value: 'OSSC CGLRE 2026' });
    var dateVar = el('input', { type: 'text', class: 'cso-mod-input', value: '30 Nov 2026' });
    var msgBody = el('textarea', { class: 'cso-mod-textarea' });
    msgBody.value = 'Dear Candidate, {{exam}} deadline is {{date}}. Download official notice at https://csodisha.com/jobs-careers/';
    var outPre = el('pre', { class: 'cso-code-pre' });

    function interpolate() {
      outPre.textContent = msgBody.value
        .replace(/\{\{exam\}\}/g, examVar.value)
        .replace(/\{\{date\}\}/g, dateVar.value);
    }

    examVar.addEventListener('input', interpolate);
    dateVar.addEventListener('input', interpolate);
    msgBody.addEventListener('input', interpolate);

    renderBanner(shell, meta.title, 'Bilingual candidate notification template composer & live variable interpolator.', [
      el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-primary', text: 'Open Live Site Banner', onclick: function () { window.CSOStudio && window.CSOStudio.openRoute('banner'); } }),
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'Export Template', onclick: function () { downloadFile(moduleId + '-template.json', JSON.stringify({ name: tplName.value, body: msgBody.value }, null, 2)); } })
    ]);

    shell.appendChild(el('div', { class: 'cso-mod-grid-2' }, [
      el('div', { class: 'cso-mod-card' }, [
        el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Template Name' }), tplName]),
        el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: '{{exam}} Variable' }), examVar]),
        el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: '{{date}} Variable' }), dateVar]),
        el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Message Body' }), msgBody])
      ]),
      el('div', { class: 'cso-mod-card' }, [
        el('h3', { text: 'Interpolated Output Preview' }),
        outPre
      ])
    ]));
    root.appendChild(shell);
    interpolate();
    return true;
  }

  /* =========================================================================
     FOLDER 13: SEO, SEARCH & DISCOVERY
     ========================================================================= */
  function renderSeoStudio(moduleId, root, actions) {
    addHeaderPill(actions, '● Live SEO & Feeds');
    var shell = el('div', { class: 'cso-mod-shell' });
    var meta = moduleMeta('folder-13', moduleId);
    var outPre = el('pre', { class: 'cso-code-pre' });

    if (moduleId === 'module-seo-003' || moduleId === 'module-13-003' || moduleId === 'module-seo-004' || moduleId === 'module-13-004' || moduleId === 'module-seo-005' || moduleId === 'module-13-005') {
      var target = (moduleId.endsWith('004')) ? '/feed.xml' : (moduleId.endsWith('005') ? '/robots.txt' : '/sitemap.xml');
      renderBanner(shell, meta.title, 'Live edge inspector for ' + target, [
        el('a', { href: target, target: '_blank', rel: 'noopener noreferrer', class: 'cso-mod-btn cso-mod-btn-primary', text: 'Open ' + target + ' ↗' })
      ]);
      shell.appendChild(el('div', { class: 'cso-mod-card' }, [outPre]));
      root.appendChild(shell);
      fetch(target, { cache: 'no-store' }).then(function (r) { return r.text(); }).then(function (t) {
        outPre.textContent = t.slice(0, 12000);
      }).catch(function (e) { outPre.textContent = 'Failed to fetch ' + target + ': ' + e.message; });
      return true;
    }

    var titleInp = el('input', { type: 'text', class: 'cso-mod-input', value: 'Common Sense Odisha — Jobs, Syllabus & CBT Mock Tests' });
    var descInp = el('textarea', { class: 'cso-mod-textarea' });
    descInp.value = 'Official Odisha government job alerts, OPSC/OSSC/OSSSC syllabus PDFs, PYQs, and bilingual mock tests.';
    var schemaType = el('select', { class: 'cso-mod-select' }, [
      el('option', { value: 'WebSite', text: 'WebSite / Organization' }),
      el('option', { value: 'Article', text: 'NewsArticle / Current Affairs' }),
      el('option', { value: 'JobPosting', text: 'JobPosting (Recruitment)' }),
      el('option', { value: 'FAQPage', text: 'FAQPage' })
    ]);

    function updateSeo() {
      var schema = {
        '@context': 'https://schema.org',
        '@type': schemaType.value,
        name: titleInp.value,
        description: descInp.value,
        url: 'https://csodisha.com/'
      };
      outPre.textContent = JSON.stringify(schema, null, 2);
    }

    titleInp.addEventListener('input', updateSeo);
    descInp.addEventListener('input', updateSeo);
    schemaType.addEventListener('change', updateSeo);

    renderBanner(shell, meta.title, 'SEO Meta, OpenGraph & JSON-LD Schema Generator connected to live /sitemap.xml and /feed.xml.', [
      el('a', { href: '/sitemap.xml', target: '_blank', rel: 'noopener noreferrer', class: 'cso-mod-btn', text: 'Sitemap ↗' }),
      el('a', { href: '/feed.xml', target: '_blank', rel: 'noopener noreferrer', class: 'cso-mod-btn', text: 'RSS Feed ↗' }),
      el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-primary', text: 'Export JSON-LD', onclick: function () { downloadFile('schema-ld.json', outPre.textContent); } })
    ]);

    shell.appendChild(el('div', { class: 'cso-mod-grid-2' }, [
      el('div', { class: 'cso-mod-card' }, [
        el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Schema Type' }), schemaType]),
        el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Meta Title' }), titleInp]),
        el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Meta Description' }), descInp])
      ]),
      el('div', { class: 'cso-mod-card' }, [
        el('h3', { text: 'Generated JSON-LD Structured Data' }),
        outPre
      ])
    ]));
    root.appendChild(shell);
    updateSeo();
    return true;
  }

  /* =========================================================================
     UNIVERSAL CONFIG / LIVE STUDIO FALLBACK FOR REMAINING SPECIALIZED MODULES
     (Finance Config, Marketing UTM, Security/RBAC, Operations/DR, Settings)
     ========================================================================= */
  function renderConfigStudio(folderId, moduleId, root, actions) {
    var meta = moduleMeta(folderId, moduleId);
    addHeaderPill(actions, '● Live Studio');
    var shell = el('div', { class: 'cso-mod-shell' });
    var notesArea = el('textarea', { class: 'cso-mod-textarea' });
    var configObj = {
      moduleId: moduleId,
      folder: meta.folderTitle,
      title: meta.title,
      environment: 'Cloudflare Pages + D1 + R2',
      cspMode: "default-src 'self'; script-src 'self'; style-src 'self'",
      timezone: 'Asia/Kolkata',
      updatedAt: new Date().toISOString()
    };
    notesArea.value = JSON.stringify(configObj, null, 2);

    renderBanner(shell, meta.title, meta.folderTitle + ' — Strict-CSP configuration & live D1/R2 inspector.', [
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'Export JSON', onclick: function () { downloadFile(moduleId + '.json', notesArea.value); } }),
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'Import JSON', onclick: function () { pickJsonFile(function (d) { notesArea.value = JSON.stringify(d, null, 2); }); } })
    ]);

    var liveStatusCard = el('div', { class: 'cso-mod-card' }, [
      el('h3', { text: 'Live Environment Telemetry' }),
      el('p', { class: 'cso-mod-muted', text: 'Fetching live D1 & maintenance status…' })
    ]);

    shell.appendChild(el('div', { class: 'cso-mod-grid-2' }, [
      el('div', { class: 'cso-mod-card' }, [
        el('h3', { text: 'Module Configuration (JSON)' }),
        notesArea
      ]),
      liveStatusCard
    ]));
    root.appendChild(shell);

    api('GET', 'stats').then(function (s) {
      clear(liveStatusCard);
      liveStatusCard.appendChild(el('h3', { text: 'Live D1 / R2 Status' }));
      liveStatusCard.appendChild(el('div', { class: 'cso-mod-grid-2' }, [
        kpiBox(String((s.current_affairs && s.current_affairs.live) || 0), 'Live Current Affairs'),
        kpiBox(String((s.jobs && s.jobs.live) || 0), 'Live Jobs'),
        kpiBox(String((s.mock_tests && s.mock_tests.live) || 0), 'Live Mock Tests'),
        kpiBox(String(s.scheduled_pending || 0), 'Scheduled Pending')
      ]));
    }).catch(function () {});

    return true;
  }

  /* =========================================================================
     COMMAND CENTRE 1-4: Overview, Edge Telemetry, Launchpad, Audit Timeline
     ========================================================================= */
  var SVGNS = 'http://www.w3.org/2000/svg';
  function svg(tag, attrs, kids) {
    var n = document.createElementNS(SVGNS, tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, String(attrs[k])); });
    [].concat(kids || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }
  function sparkline(values, cls) {
    var w = 120, h = 32, max = Math.max.apply(null, values.concat([1]));
    var step = values.length > 1 ? w / (values.length - 1) : w;
    var pts = values.map(function (v, i) { return (i * step).toFixed(1) + ',' + (h - 3 - (v / max) * (h - 6)).toFixed(1); }).join(' ');
    return svg('svg', { viewBox: '0 0 ' + w + ' ' + h, class: 'cso-spark ' + (cls || ''), role: 'img', 'aria-label': 'trend ' + values.join(',') }, [
      svg('polyline', { points: pts, fill: 'none', 'stroke-width': 2, class: 'cso-spark-line' })
    ]);
  }
  function dayBuckets(items, days) {
    var out = [], now = new Date();
    for (var i = days - 1; i >= 0; i--) {
      var d = new Date(now.getTime() - i * 86400000).toISOString().slice(0, 10);
      out.push(items.filter(function (a) { return String(a.created_at || '').slice(0, 10) === d; }).length);
    }
    return out;
  }
  function pubUrl(kind, slug) {
    if (kind === 'jobs') return '/jobs-careers/?job=' + encodeURIComponent(slug || '');
    if (kind === 'current-affairs') return '/current-affairs/?slug=' + encodeURIComponent(slug || '');
    return '/mock-tests/?test=' + encodeURIComponent(slug || '');
  }
  function openLink(href, text) {
    return el('a', { href: href, target: '_blank', rel: 'noopener noreferrer', class: 'cso-mod-btn cso-mod-btn-sm', text: text || 'Preview ↗' });
  }
  function pills(options, onPick) {
    var wrap = el('div', { class: 'cso-mod-tabs' });
    function mark(v) { Array.prototype.forEach.call(wrap.children, function (b) { b.classList.toggle('is-active', b.getAttribute('data-v') === v); }); }
    options.forEach(function (o, i) {
      wrap.appendChild(el('button', { type: 'button', 'data-v': o, class: 'cso-mod-tab' + (i === 0 ? ' is-active' : ''), text: o, onclick: function () { mark(o); onPick(o); } }));
    });
    return wrap;
  }
  function loading(host, msg) { clear(host); host.appendChild(el('p', { class: 'cso-mod-muted', text: msg })); }
  function fail(host, e) { clear(host); host.appendChild(el('p', { class: 'cso-mod-badge cso-mod-badge-err', text: 'Error: ' + e.message })); }

  function renderOverviewCC(root, actions) {
    addHeaderPill(actions, '● Live D1 Command Overview');
    var shell = el('div', { class: 'cso-mod-shell' });
    var host = el('div', { class: 'cso-mod-shell' });
    renderBanner(shell, 'Executive Command Overview', 'Live D1 KPIs, activity trends, triage queue, operational pulse, and homepage broadcast control.', [
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'Refresh', onclick: load })
    ]);
    shell.appendChild(host);
    root.appendChild(shell);

    async function runSeed(btn) {
      if (btn) btn.disabled = true;
      try {
        var res = await api('POST', 'seed-odisha');
        var ins = res.inserted || {};
        var totalIns = (ins.jobs || 0) + (ins.current_affairs || 0) + (ins.mock_tests || 0) + (ins.resources || 0);
        toast(totalIns ? ('Seeded ' + totalIns + ' Odisha starter records into D1!') : 'Starter content already present in D1.', 'success');
        await load();
      } catch (e) {
        toast(e.message, 'crimson');
      } finally {
        if (btn) btn.disabled = false;
      }
    }

    async function load() {
      loading(host, 'Loading live D1 telemetry…');
      try {
        var r = await Promise.all([
          api('GET', 'stats'),
          api('GET', 'jobs?limit=100'),
          api('GET', 'current-affairs?limit=100'),
          api('GET', 'audit?limit=100'),
          api('GET', 'banner'),
          api('GET', 'pages').catch(function () { return { total: 0, pages: [] }; })
        ]);
        var stats = r[0], jobs = r[1].items || [], cas = r[2].items || [], audits = r[3].items || [], banner = r[4], pagesRes = r[5];
        var now = Date.now();
        var expiring = jobs.filter(function (j) {
          if (j.status !== 'published' || !j.last_date) return false;
          var t = Date.parse(j.last_date + 'T23:59:59+05:30') - now;
          return t > 0 && t < 72 * 3600000;
        });
        var trend = dayBuckets(audits, 7);
        var openMod = function (f, m) { return function () { window.selectModule && window.selectModule(f, m); }; };
        var openRt = function (rt) { return function () { window.CSOStudio && window.CSOStudio.openRoute(rt); }; };

        // 8-card (4x2) balanced KPI grid with quick-create + action links
        var kpis = [
          ['Active Jobs', (stats.jobs && stats.jobs.live) || 0, trend, openRt('jobs/new'), 'Create Job'],
          ['Expiring <72h', expiring.length, null, openMod('folder-05', 'module-05-008'), 'Manage Jobs'],
          ['Current Affairs', (stats.current_affairs && stats.current_affairs.live) || 0, trend, openRt('current-affairs/new'), 'Create Digest'],
          ['Mock Tests', (stats.mock_tests && stats.mock_tests.live) || 0, null, openRt('mock-tests/new'), 'Create Mock Test'],
          ['Live Pages & Portals', pagesRes.total || (pagesRes.pages && pagesRes.pages.length) || 0, null, openMod('folder-02', 'module-02-002'), 'Create Page'],
          ['CBT Attempts', stats.attempts_total || 0, null, openMod('folder-05', 'module-05-014'), 'View Tests'],
          ['Bookmarks', stats.bookmarks_total || 0, null, openMod('folder-10', 'module-10-001'), 'Analytics'],
          ['Registered Users', (stats.accounts && stats.accounts.total) || 0, null, openMod('folder-09', 'module-09-001'), 'Manage Users']
        ];
        clear(host);
        host.appendChild(el('div', { class: 'cso-mod-grid-4' }, kpis.map(function (k) {
          var card = el('div', { class: 'cso-mod-kpi' }, [
            el('div', { class: 'cso-kpi-head' }, [
              el('div', {}, [
                el('div', { class: 'cso-mod-kpi-val', text: String(k[1]) }),
                el('div', { class: 'cso-mod-kpi-lbl', text: k[0] })
              ]),
              el('button', { type: 'button', class: 'cso-kpi-plus', title: k[4], 'aria-label': k[4], text: '+', onclick: k[3] })
            ]),
            sparkline(k[2] || [0, k[1]], k[0] === 'Expiring <72h' && k[1] ? 'is-warn' : '')
          ]);
          return card;
        })));

        // Inline expandable Homepage Broadcast Banner composer
        var composerOpen = false;
        var composerBody = el('div', { class: 'cso-mod-shell cso-hidden' });
        var bHeadInp = el('input', { type: 'text', class: 'cso-mod-input', value: banner.headline || '', placeholder: 'Urgent announcement headline…' });
        var bSevSel = el('select', { class: 'cso-mod-select' }, ['info', 'notice', 'urgent'].map(function (s) {
          return el('option', { value: s, text: s.toUpperCase(), selected: (banner.severity || 'info') === s });
        }));
        var bUrlInp = el('input', { type: 'text', class: 'cso-mod-input', value: banner.ctaUrl || '', placeholder: '/jobs-careers/' });
        var bActChk = el('input', { type: 'checkbox' });
        bActChk.checked = !!banner.active;
        var prevStrip = el('div', { class: 'cso-banner-preview cso-banner-' + (banner.severity || 'info') + (banner.active ? '' : ' is-off') });

        function syncBannerPreview() {
          prevStrip.className = 'cso-banner-preview cso-banner-' + bSevSel.value + (bActChk.checked ? '' : ' is-off');
          prevStrip.textContent = (bActChk.checked ? '[LIVE ' : '[INACTIVE ') + bSevSel.value.toUpperCase() + '] ' + (bHeadInp.value.trim() || 'No headline set') + (bUrlInp.value.trim() ? ' → ' + bUrlInp.value.trim() : '');
        }
        bHeadInp.addEventListener('input', syncBannerPreview);
        bSevSel.addEventListener('change', syncBannerPreview);
        bUrlInp.addEventListener('input', syncBannerPreview);
        bActChk.addEventListener('change', syncBannerPreview);
        syncBannerPreview();

        composerBody.appendChild(el('div', { class: 'cso-mod-grid-3' }, [
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Headline' }), bHeadInp]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Badge / Severity' }), bSevSel]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Link URL' }), bUrlInp])
        ]));
        composerBody.appendChild(el('div', { class: 'cso-inline-row' }, [
          el('label', { class: 'cso-check-label' }, [bActChk, el('span', { text: 'Active on Homepage' })]),
          el('button', {
            type: 'button',
            class: 'cso-mod-btn cso-mod-btn-primary cso-mod-btn-sm',
            text: 'Save & Publish Banner',
            onclick: async function () {
              try {
                await api('PUT', 'banner', {
                  active: bActChk.checked,
                  severity: bSevSel.value,
                  headline: bHeadInp.value.trim(),
                  context: banner.context || '',
                  ctaText: banner.ctaText || (bUrlInp.value.trim() ? 'View' : ''),
                  ctaUrl: bUrlInp.value.trim()
                });
                toast(bActChk.checked ? 'Homepage banner published live!' : 'Homepage banner saved (inactive)', 'success');
                load();
              } catch (e) { toast(e.message, 'crimson'); }
            }
          })
        ]));

        var bBadge = badge(banner.active ? 'LIVE: ' + banner.headline : 'Inactive', banner.active ? 'ok' : 'info');
        var expandBtn = el('button', {
          type: 'button',
          class: 'cso-mod-btn cso-mod-btn-sm',
          text: 'Compose Inline ▾',
          onclick: function () {
            composerOpen = !composerOpen;
            composerBody.classList.toggle('cso-hidden', !composerOpen);
            expandBtn.textContent = composerOpen ? 'Hide Composer ▴' : 'Compose Inline ▾';
          }
        });
        host.appendChild(el('div', { class: 'cso-mod-card' }, [
          el('div', { class: 'cso-drawer-head' }, [
            el('div', { class: 'cso-inline-row' }, [el('h3', { text: 'Homepage Broadcast Banner' }), bBadge]),
            el('div', { class: 'cso-mod-toolbar' }, [
              expandBtn,
              el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Homepage Builder', onclick: openMod('folder-02', 'module-02-004') })
            ])
          ]),
          prevStrip,
          composerBody
        ]));

        // 2-Column Operational Pulse Row (5 latest audit entries + Site/Edge/CSP readiness)
        var pulseLeft = el('div', { class: 'cso-mod-card' }, [
          el('div', { class: 'cso-drawer-head' }, [
            el('h3', { text: 'Operational Pulse — Latest Audit' }),
            el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Full Timeline', onclick: openMod('folder-01', 'module-01-004') })
          ]),
          audits.length ? safeTable(['Action', 'Target', 'Actor', 'Time'], audits.slice(0, 5).map(function (a) {
            return el('tr', {}, [
              el('td', {}, badge(a.action || 'event', 'info')),
              el('td', { text: a.target_id || a.target_type || '—' }),
              el('td', { text: a.actor_email || 'system' }),
              el('td', { text: a.created_at || '—' })
            ]);
          })) : el('p', { class: 'cso-mod-muted', text: 'No audit events recorded yet.' })
        ]);

        var readinessHost = el('div', { class: 'cso-mod-shell' }, [el('p', { class: 'cso-mod-muted', text: 'Checking live edge & CSP readiness…' })]);
        var pulseRight = el('div', { class: 'cso-mod-card' }, [
          el('div', { class: 'cso-drawer-head' }, [
            el('h3', { text: 'Site / Edge / CSP Readiness' }),
            el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Live Site Status', onclick: openMod('folder-01', 'module-01-002') })
          ]),
          readinessHost
        ]);
        host.appendChild(el('div', { class: 'cso-mod-grid-2' }, [pulseLeft, pulseRight]));

        Promise.all(['/', '/api/health', '/api/content/jobs'].map(async function (p) {
          var t0 = performance.now();
          try {
            var res = await fetch(p, { credentials: 'same-origin', cache: 'no-store' });
            return { path: p, ok: res.ok, status: res.status, ms: Math.round(performance.now() - t0), csp: !!res.headers.get('content-security-policy'), cc: res.headers.get('cache-control') || '—' };
          } catch (e) {
            return { path: p, ok: false, status: 0, ms: Math.round(performance.now() - t0), csp: false, cc: e.message };
          }
        })).then(function (probes) {
          clear(readinessHost);
          readinessHost.appendChild(safeTable(['Endpoint', 'Status', 'Latency', 'CSP / Cache'], probes.map(function (pr) {
            return el('tr', {}, [
              el('td', { text: pr.path }),
              el('td', {}, badge(String(pr.status || 'ERR'), pr.ok ? 'ok' : 'err')),
              el('td', { text: pr.ms + ' ms' }),
              el('td', {}, [pr.csp ? badge('CSP ✓', 'ok') : badge(pr.cc.slice(0, 24), 'info')])
            ]);
          })));
        }).catch(function () {});

        // Triage + Empty-state Odisha Seeder
        var queue = [];
        jobs.forEach(function (j) {
          if (j.status === 'draft' || j.status === 'scheduled') queue.push({ kind: 'jobs', it: j, why: j.status });
          else if (expiring.indexOf(j) >= 0) queue.push({ kind: 'jobs', it: j, why: 'expires ' + j.last_date });
          else if (j.status === 'expired') queue.push({ kind: 'jobs', it: j, why: 'expired' });
        });
        cas.forEach(function (c) { if (c.status === 'draft' || c.status === 'scheduled') queue.push({ kind: 'current-affairs', it: c, why: c.status }); });
        var rows = queue.slice(0, 30).map(function (q) {
          var it = q.it, btns = [];
          if (it.status !== 'published') btns.push(el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-primary cso-mod-btn-sm', text: 'Publish', onclick: async function () {
            try { await api('POST', q.kind + '/' + encodeURIComponent(it.id) + '/status', { status: 'published' }); toast('Published', 'success'); load(); } catch (e) { toast(e.message, 'crimson'); }
          } }));
          if (q.kind === 'jobs') btns.push(el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Extend +7d', onclick: async function () {
            try {
              var full = await api('GET', 'jobs/' + encodeURIComponent(it.id));
              var base = full.last_date ? new Date(full.last_date + 'T00:00:00Z') : new Date();
              if (base.getTime() < now) base = new Date();
              full.last_date = new Date(base.getTime() + 7 * 86400000).toISOString().slice(0, 10);
              if (full.status === 'expired') full.status = 'published';
              await api('PUT', 'jobs/' + encodeURIComponent(it.id), full);
              toast('Deadline extended to ' + full.last_date, 'success'); load();
            } catch (e) { toast(e.message, 'crimson'); }
          } }));
          btns.push(openLink(pubUrl(q.kind, it.slug)));
          return el('tr', {}, [el('td', {}, badge(q.kind === 'jobs' ? 'Job' : 'Current Affairs', 'info')), el('td', { text: it.title }), el('td', {}, badge(q.why, 'warn')), el('td', {}, el('div', { class: 'cso-mod-toolbar' }, btns))]);
        });

        var triageCard = el('div', { class: 'cso-mod-card' }, [
          el('div', { class: 'cso-drawer-head' }, [
            el('h3', { text: 'Needs Attention — Triage Queue (' + queue.length + ')' }),
            el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Seed Odisha Starter Content', onclick: function (ev) { runSeed(ev.currentTarget); } })
          ])
        ]);
        if (queue.length) {
          triageCard.appendChild(safeTable(['Type', 'Title', 'Reason', 'Actions'], rows));
        } else {
          var seedBtn = el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-primary', text: 'Seed Odisha Starter Content', onclick: function () { runSeed(seedBtn); } });
          triageCard.appendChild(el('div', { class: 'cso-inline-row' }, [
            el('p', { class: 'cso-mod-muted', text: 'Triage queue is clear. Need realistic OPSC / OSSC / OSSSC jobs, digests, mock tests, and syllabus records in D1?' }),
            seedBtn
          ]));
        }
        host.appendChild(triageCard);
      } catch (e) { fail(host, e); }
    }
    load();
  }

  var PROBES = ['/', '/jobs-careers/', '/current-affairs/', '/mock-tests/', '/resources/', '/sitemap.xml', '/feed.xml', '/robots.txt', '/api/health', '/admin/site-manifest.json'];
  function renderEdgeStudio(root, actions) {
    addHeaderPill(actions, '● Edge & Endpoint Telemetry');
    var shell = el('div', { class: 'cso-mod-shell' });
    var kpiHost = el('div', { class: 'cso-mod-grid-4' });
    var chartHost = el('div', { class: 'cso-mod-card' }), tableHost = el('div', {}), drawer = el('div', { class: 'cso-mod-card cso-hidden' });
    var results = [], filter = 'All';
    var customInp = el('input', { type: 'text', class: 'cso-mod-input', placeholder: '/about.html or /my-route/' });

    async function probeOne(p) {
      var t0 = performance.now(), out = { path: p, status: 0, ms: 0, headers: {} };
      try {
        var res = await fetch(p, { credentials: 'same-origin', cache: 'no-store' });
        await res.clone().arrayBuffer();
        out.status = res.status; out.ms = Math.round(performance.now() - t0);
        res.headers.forEach(function (v, k) { out.headers[k] = v; });
      } catch (e) { out.ms = Math.round(performance.now() - t0); out.headers = { error: e.message }; }
      return out;
    }

    renderBanner(shell, 'Edge & Endpoint Telemetry Studio', 'Real fetch() probes: latency, status, Cache-Control, CSP and Content-Type.', [
      customInp,
      el('button', {
        type: 'button',
        class: 'cso-mod-btn',
        text: 'Probe Custom Route',
        onclick: async function () {
          var p = customInp.value.trim();
          if (!p) return;
          if (!p.startsWith('/')) p = '/' + p;
          var r = await probeOne(p);
          results = [r].concat(results.filter(function (x) { return x.path !== p; }));
          draw();
          inspect(r);
        }
      }),
      el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-primary', text: 'Re-Probe All Endpoints', onclick: probeAll })
    ]);
    shell.appendChild(kpiHost);
    shell.appendChild(pills(['All', 'Healthy 200', 'Slow >400ms', 'Errors'], function (f) { filter = f; draw(); }));
    shell.appendChild(chartHost); shell.appendChild(tableHost); shell.appendChild(drawer);
    root.appendChild(shell);

    function pass(r) {
      if (filter === 'Healthy 200') return r.status === 200 && r.ms <= 400;
      if (filter === 'Slow >400ms') return r.ms > 400;
      if (filter === 'Errors') return !r.status || r.status >= 400;
      return true;
    }
    function inspect(r) {
      clear(drawer); drawer.classList.remove('cso-hidden');
      drawer.appendChild(el('h3', { text: 'Page Inspector — ' + r.path }));
      var hrows = Object.keys(r.headers).map(function (k) { return el('tr', {}, [el('td', { text: k }), el('td', { text: r.headers[k] })]); });
      drawer.appendChild(safeTable(['Header', 'Value'], hrows));
      drawer.appendChild(el('div', { class: 'cso-mod-toolbar' }, [openLink(r.path, 'Open in tab ↗'), el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Close', onclick: function () { drawer.classList.add('cso-hidden'); } })]));
      drawer.appendChild(el('iframe', { src: r.path, class: 'cso-inspector-frame', title: 'Preview ' + r.path, sandbox: 'allow-same-origin' }));
    }
    function renderKpis() {
      clear(kpiHost);
      if (!results.length) return;
      var totalMs = results.reduce(function (a, r) { return a + r.ms; }, 0);
      var avgMs = Math.round(totalMs / results.length);
      var upCount = results.filter(function (r) { return r.status >= 200 && r.status < 400; }).length;
      var htmlRoutes = results.filter(function (r) { return (r.headers['content-type'] || '').toLowerCase().indexOf('text/html') !== -1; });
      var htmlCspOk = htmlRoutes.filter(function (r) { return !!r.headers['content-security-policy']; }).length;
      var cspPct = htmlRoutes.length ? Math.round((htmlCspOk / htmlRoutes.length) * 100) + '%' : '100%';
      var sorted = results.slice().sort(function (a, b) { return a.ms - b.ms; });
      var fastSlow = sorted.length ? (sorted[0].ms + 'ms / ' + sorted[sorted.length - 1].ms + 'ms') : '—';
      [
        ['Avg Edge Latency', avgMs + ' ms'],
        ['Endpoint Uptime', upCount + ' / ' + results.length],
        ['HTML CSP Coverage', cspPct + ' (' + htmlCspOk + '/' + htmlRoutes.length + ')'],
        ['Fastest / Slowest', fastSlow]
      ].forEach(function (k) {
        kpiHost.appendChild(kpiBox(k[1], k[0]));
      });
    }
    function draw() {
      renderKpis();
      var shown = results.filter(pass);
      clear(chartHost);
      chartHost.appendChild(el('h3', { text: 'Response Time (ms)' }));
      var max = Math.max.apply(null, results.map(function (r) { return r.ms; }).concat([100]));
      var g = svg('svg', { viewBox: '0 0 600 ' + (shown.length * 22 + 6), class: 'cso-bar-svg', role: 'img', 'aria-label': 'Response time bar chart' });
      shown.forEach(function (r, i) {
        var w = Math.max(2, (r.ms / max) * 330);
        g.appendChild(svg('text', { x: 0, y: i * 22 + 15, class: 'cso-bar-lbl' }, [])); g.lastChild.textContent = r.path;
        g.appendChild(svg('rect', { x: 190, y: i * 22 + 4, width: w.toFixed(1), height: 14, rx: 3, class: r.status >= 400 || !r.status ? 'cso-bar-err' : r.ms > 400 ? 'cso-bar-warn' : 'cso-bar-ok' }));
        g.appendChild(svg('text', { x: 196 + w, y: i * 22 + 15, class: 'cso-bar-lbl' }, [])); g.lastChild.textContent = r.ms + ' ms';
      });
      chartHost.appendChild(g);
      var rows = shown.map(function (r) {
        var isHtml = (r.headers['content-type'] || '').toLowerCase().indexOf('text/html') !== -1;
        var cspCell = isHtml
          ? badge(r.headers['content-security-policy'] ? 'CSP ✓' : 'no CSP', r.headers['content-security-policy'] ? 'ok' : 'warn')
          : badge('Asset / API', 'info');
        return el('tr', {}, [el('td', { text: r.path }), el('td', {}, badge(String(r.status || 'ERR'), r.status === 200 ? 'ok' : 'err')), el('td', { text: r.ms + ' ms' }),
          el('td', { text: r.headers['cache-control'] || '—' }), el('td', {}, cspCell),
          el('td', { text: r.headers['content-type'] || '—' }),
          el('td', {}, el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Inspect', onclick: function () { inspect(r); } }))]);
      });
      clear(tableHost); tableHost.appendChild(safeTable(['Path', 'HTTP', 'Latency', 'Cache-Control', 'CSP', 'Content-Type', 'Inspect'], rows));
    }
    async function probeAll() {
      loading(tableHost, 'Probing…');
      results = await Promise.all(PROBES.map(probeOne));
      draw();
    }
    probeAll();
  }

  function renderLaunchpad(root, actions) {
    addHeaderPill(actions, '● Command Launchpad');
    var shell = el('div', { class: 'cso-mod-shell' });
    var host = el('div', { class: 'cso-mod-shell' });
    var drawerHost = el('div', {});
    var maint = el('div', { class: 'cso-mod-card' });
    var diffHost = el('div', {});
    var diffPre = el('pre', { class: 'cso-code-pre cso-hidden' });
    renderBanner(shell, 'Command Launchpad & Maintenance Studio', 'Symmetrical 8-card launchpad with real pre-publish split-pane previews, R2 asset preview, and observable cron telemetry.', [
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'Refresh', onclick: function () { load(); } })
    ]);
    shell.appendChild(host);
    shell.appendChild(drawerHost);
    shell.appendChild(maint);
    root.appendChild(shell);

    var lastUploadedFile = null;
    var fileInp = el('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp,application/pdf', class: 'cso-hidden' });
    fileInp.addEventListener('change', async function () {
      var f = fileInp.files[0];
      if (!f) return;
      var fd = new FormData(); fd.append('file', f);
      try {
        var d = await api('POST', 'media/upload', fd, true);
        var key = d.key || d.object_key || '';
        lastUploadedFile = { key: key, url: d.url || ('/api/media/' + key), name: f.name, size: f.size, mime: f.type };
        toast('Uploaded to R2: ' + key, 'success');
        openAssetPreview(lastUploadedFile);
        load();
      } catch (e) { toast(e.message, 'crimson'); }
      fileInp.value = '';
    });
    shell.appendChild(fileInp);

    function openAssetPreview(asset) {
      clear(drawerHost);
      var isPdf = (asset.mime || '').indexOf('pdf') !== -1 || /\.pdf$/i.test(asset.key || asset.name || '');
      var previewNode = isPdf
        ? el('iframe', { src: asset.url, class: 'cso-asset-preview-pdf', title: 'PDF Preview' })
        : el('img', { src: asset.url, alt: asset.name || asset.key, class: 'cso-asset-preview-img' });
      drawerHost.appendChild(el('div', { class: 'cso-drawer' }, [
        el('div', { class: 'cso-drawer-head' }, [
          el('strong', { text: 'Real R2 Asset Preview — ' + (asset.name || asset.key) }),
          el('div', { class: 'cso-mod-toolbar' }, [
            badge(isPdf ? 'PDF' : 'Image', 'info'),
            el('button', {
              type: 'button',
              class: 'cso-mod-btn cso-mod-btn-sm',
              text: 'Copy Public URL',
              onclick: function () {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                  navigator.clipboard.writeText(asset.url).then(function () { toast('Copied ' + asset.url, 'success'); }).catch(function () { toast(asset.url); });
                } else { toast(asset.url); }
              }
            }),
            el('a', { href: asset.url, target: '_blank', rel: 'noopener noreferrer', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Open ↗' }),
            el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Close', onclick: function () { clear(drawerHost); } })
          ])
        ]),
        el('div', { class: 'cso-mod-grid-2' }, [
          el('div', {}, [
            el('p', { class: 'cso-mod-muted', text: 'Public URL: ' + asset.url }),
            el('p', { class: 'cso-mod-muted', text: 'Size: ' + Math.round((asset.size || 0) / 1024) + ' KB · MIME: ' + (asset.mime || 'unknown') })
          ]),
          previewNode
        ])
      ]));
    }

    function openContentComposer(kind) {
      clear(drawerHost);
      var mobile = false;
      var labels = {
        jobs: { head: 'Create Job Alert', org: 'Organisation (e.g. OPSC / OSSC)', date: 'Last Date', extra: 'Official Apply URL', defOrg: 'Odisha Public Service Commission', defUrl: 'https://www.opsc.gov.in/' },
        'current-affairs': { head: 'Create Current Affairs Digest', org: 'Category (Odisha / National)', date: 'Event Date', extra: 'Tags (comma separated)', defOrg: 'Odisha', defUrl: 'Odisha, Cabinet, GK' },
        'mock-tests': { head: 'Create CBT Mock Test', org: 'Target Exam (e.g. OSSC CGL)', date: 'Duration (Minutes)', extra: 'Total Marks', defOrg: 'OSSC CGLRE', defUrl: '50' }
      };
      var cfg = labels[kind];
      var titleInp = el('input', { type: 'text', class: 'cso-mod-input', placeholder: 'Enter headline / title…' });
      var orgInp = el('input', { type: 'text', class: 'cso-mod-input', value: cfg.defOrg });
      var dateInp = el('input', { type: kind === 'mock-tests' ? 'number' : 'date', class: 'cso-mod-input', value: kind === 'mock-tests' ? '30' : new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10) });
      var sumInp = el('textarea', { class: 'cso-mod-textarea', placeholder: 'Concise candidate summary / details…' });
      var extraInp = el('input', { type: 'text', class: 'cso-mod-input', value: cfg.defUrl });
      var schedInp = el('input', { type: 'datetime-local', class: 'cso-mod-input' });

      var prevCard = el('div', { class: 'cso-preview-card-desktop' });
      var vpBtn = el('button', {
        type: 'button',
        class: 'cso-mod-btn cso-mod-btn-sm',
        text: 'Mobile 375px',
        onclick: function () {
          mobile = !mobile;
          prevCard.className = mobile ? 'cso-preview-card-mobile' : 'cso-preview-card-desktop';
          vpBtn.textContent = mobile ? 'Desktop 100%' : 'Mobile 375px';
        }
      });

      function renderPrev() {
        clear(prevCard);
        var t = titleInp.value.trim() || 'Untitled ' + cfg.head;
        var o = orgInp.value.trim() || cfg.defOrg;
        var d = dateInp.value || '—';
        var s = sumInp.value.trim() || 'Candidate summary and official portal details will appear here as you type…';
        var ex = extraInp.value.trim();
        prevCard.appendChild(el('div', { class: 'cso-drawer-head' }, [
          badge(kind === 'jobs' ? 'JOB ALERT' : (kind === 'current-affairs' ? 'CURRENT AFFAIRS' : 'CBT MOCK TEST'), 'info'),
          badge('UNPUBLISHED PREVIEW', 'warn')
        ]));
        prevCard.appendChild(el('h3', { text: t }));
        prevCard.appendChild(el('p', { class: 'cso-mod-muted', text: (kind === 'mock-tests' ? 'Exam: ' + o + ' · ' + d + ' mins · ' + ex + ' marks' : o + ' · Date: ' + d) }));
        prevCard.appendChild(el('p', { text: s }));
        if (ex && kind === 'jobs') prevCard.appendChild(el('span', { class: 'cso-mod-badge cso-mod-badge-ok', text: 'Apply Link: ' + ex }));
        if (ex && kind === 'current-affairs') prevCard.appendChild(el('span', { class: 'cso-mod-badge cso-mod-badge-info', text: 'Tags: ' + ex }));
      }

      [titleInp, orgInp, dateInp, sumInp, extraInp].forEach(function (inp) { inp.addEventListener('input', renderPrev); });

      async function saveEntry(status) {
        var title = titleInp.value.trim();
        if (!title) { toast('Title is required', 'crimson'); return; }
        if (status === 'scheduled' && !schedInp.value) { toast('Select a schedule date & time', 'crimson'); return; }
        var payload;
        if (kind === 'jobs') {
          payload = { title: title, organisation: orgInp.value.trim(), last_date: dateInp.value || null, summary: sumInp.value.trim(), apply_url: extraInp.value.trim(), category: 'Odisha', state: 'Odisha', status: status, published_at: status === 'scheduled' ? new Date(schedInp.value).toISOString() : undefined };
        } else if (kind === 'current-affairs') {
          payload = { title: title, category: orgInp.value.trim() || 'Odisha', event_date: dateInp.value || undefined, summary: sumInp.value.trim(), tags: extraInp.value.split(',').map(function (x) { return x.trim(); }).filter(Boolean), status: status, published_at: status === 'scheduled' ? new Date(schedInp.value).toISOString() : undefined };
        } else {
          payload = { title: title, target_exam: orgInp.value.trim(), duration_minutes: Number(dateInp.value) || 30, total_marks: Number(extraInp.value) || 50, negative_marking: 0.25, status: status, published_at: status === 'scheduled' ? new Date(schedInp.value).toISOString() : undefined };
        }
        try {
          await api('POST', kind, payload);
          toast((status === 'published' ? 'Published live: ' : 'Saved (' + status + '): ') + title, 'success');
          clear(drawerHost);
          load();
        } catch (e) { toast(e.message, 'crimson'); }
      }

      drawerHost.appendChild(el('div', { class: 'cso-drawer' }, [
        el('div', { class: 'cso-drawer-head' }, [
          el('strong', { text: cfg.head + ' — Pre-Publish Split-Pane Composer' }),
          el('div', { class: 'cso-mod-toolbar' }, [
            vpBtn,
            el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Close', onclick: function () { clear(drawerHost); } })
          ])
        ]),
        el('div', { class: 'cso-mod-grid-2' }, [
          el('div', { class: 'cso-mod-shell' }, [
            el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Title' }), titleInp]),
            el('div', { class: 'cso-mod-grid-2' }, [
              el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: cfg.org }), orgInp]),
              el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: cfg.date }), dateInp])
            ]),
            el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Summary / Details' }), sumInp]),
            el('div', { class: 'cso-mod-grid-2' }, [
              el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: cfg.extra }), extraInp]),
              el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Schedule (optional)' }), schedInp])
            ]),
            el('div', { class: 'cso-mod-toolbar' }, [
              el('button', { type: 'button', class: 'cso-mod-btn', text: 'Save as Draft (Unpublished)', onclick: function () { saveEntry('draft'); } }),
              el('button', { type: 'button', class: 'cso-mod-btn', text: 'Schedule', onclick: function () { saveEntry('scheduled'); } }),
              el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-primary', text: 'Publish Live Now', onclick: function () { saveEntry('published'); } })
            ])
          ]),
          el('div', { class: 'cso-mod-shell' }, [
            el('h4', { text: 'Real-Time Candidate Portal Preview (Before Publishing)' }),
            prevCard
          ])
        ])
      ]));
      renderPrev();
    }

    function openBannerComposer(banner) {
      clear(drawerHost);
      var hInp = el('input', { type: 'text', class: 'cso-mod-input', value: banner.headline || '', placeholder: 'Urgent announcement headline…' });
      var cInp = el('input', { type: 'text', class: 'cso-mod-input', value: banner.context || '', placeholder: 'Supporting context…' });
      var sSel = el('select', { class: 'cso-mod-select' }, ['info', 'notice', 'urgent'].map(function (s) {
        return el('option', { value: s, text: s.toUpperCase(), selected: (banner.severity || 'info') === s });
      }));
      var tInp = el('input', { type: 'text', class: 'cso-mod-input', value: banner.ctaText || 'View', placeholder: 'Button label' });
      var uInp = el('input', { type: 'text', class: 'cso-mod-input', value: banner.ctaUrl || '/jobs-careers/', placeholder: '/jobs-careers/' });
      var aChk = el('input', { type: 'checkbox' }); aChk.checked = !!banner.active;
      var overlay = el('div', { class: 'cso-banner-preview' });
      var frame = el('iframe', { src: '/?preview=1&t=' + Date.now(), class: 'cso-preview-frame', title: 'Live Homepage Preview' });

      function syncOverlay() {
        overlay.className = 'cso-banner-preview cso-banner-' + sSel.value + (aChk.checked ? '' : ' is-off');
        overlay.textContent = '[' + sSel.value.toUpperCase() + (aChk.checked ? ' · ACTIVE' : ' · PREVIEW ONLY') + '] ' + (hInp.value.trim() || 'Banner headline preview') + (cInp.value.trim() ? ' — ' + cInp.value.trim() : '') + (tInp.value.trim() ? ' [' + tInp.value.trim() + ' → ' + uInp.value.trim() + ']' : '');
      }
      [hInp, cInp, sSel, tInp, uInp, aChk].forEach(function (x) { x.addEventListener('input', syncOverlay); x.addEventListener('change', syncOverlay); });
      syncOverlay();

      async function saveBanner(activeFlag) {
        try {
          await api('PUT', 'banner', { active: activeFlag, severity: sSel.value, headline: hInp.value.trim(), context: cInp.value.trim(), ctaText: tInp.value.trim(), ctaUrl: uInp.value.trim() });
          toast(activeFlag ? 'Homepage Banner published live!' : 'Banner saved (inactive)', 'success');
          frame.src = '/?preview=1&t=' + Date.now();
          load();
        } catch (e) { toast(e.message, 'crimson'); }
      }

      drawerHost.appendChild(el('div', { class: 'cso-drawer' }, [
        el('div', { class: 'cso-drawer-head' }, [
          el('strong', { text: 'Edit & Preview Homepage Banner' }),
          el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Close', onclick: function () { clear(drawerHost); } })
        ]),
        el('div', { class: 'cso-mod-grid-2' }, [
          el('div', { class: 'cso-mod-shell' }, [
            el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Headline' }), hInp]),
            el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Context' }), cInp]),
            el('div', { class: 'cso-mod-grid-3' }, [
              el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Severity' }), sSel]),
              el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'CTA Label' }), tInp]),
              el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'CTA URL' }), uInp])
            ]),
            el('div', { class: 'cso-mod-toolbar' }, [
              el('label', { class: 'cso-check-label' }, [aChk, el('span', { text: 'Active' })]),
              el('button', { type: 'button', class: 'cso-mod-btn', text: 'Save Inactive', onclick: function () { saveBanner(false); } }),
              el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-primary', text: 'Publish Live', onclick: function () { saveBanner(true); } })
            ])
          ]),
          el('div', { class: 'cso-mod-shell' }, [
            el('h4', { text: 'Unpublished Banner Overlay + Live Homepage' }),
            overlay,
            el('div', { class: 'cso-preview-frame-wrap' }, [frame])
          ])
        ])
      ]));
    }

    function openRowPreview(kind, item) {
      clear(drawerHost);
      drawerHost.appendChild(el('div', { class: 'cso-drawer' }, [
        el('div', { class: 'cso-drawer-head' }, [
          el('div', { class: 'cso-inline-row' }, [
            badge(kind === 'jobs' ? 'Job Alert' : 'Current Affairs', 'info'),
            badge(item.status || 'draft', 'warn'),
            el('strong', { text: item.title || item.slug })
          ]),
          el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Close', onclick: function () { clear(drawerHost); } })
        ]),
        el('div', { class: 'cso-preview-card-desktop' }, [
          el('h3', { text: item.title }),
          el('p', { class: 'cso-mod-muted', text: (item.organisation || item.category || 'Odisha') + ' · Date: ' + (item.last_date || item.event_date || item.published_at || '—') }),
          el('p', { text: item.summary || item.body_md || 'No summary text recorded.' }),
          item.apply_url ? el('span', { class: 'cso-mod-badge cso-mod-badge-ok', text: 'Apply URL: ' + item.apply_url }) : null
        ])
      ]));
    }

    function snap(s) { return { ca_live: s.current_affairs && s.current_affairs.live, jobs_live: s.jobs && s.jobs.live, jobs_expired: s.jobs && s.jobs.expired, tests_live: s.mock_tests && s.mock_tests.live, scheduled_pending: s.scheduled_pending }; }
    async function backup() {
      try {
        var r = await Promise.all([api('GET', 'current-affairs?limit=100'), api('GET', 'jobs?limit=100'), api('GET', 'mock-tests?limit=100'), api('GET', 'resources?limit=100'), api('GET', 'audit?limit=100')]);
        downloadFile('cso-d1-backup-' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify({ exported_at: new Date().toISOString(), current_affairs: r[0].items, jobs: r[1].items, mock_tests: r[2].items, resources: r[3].items, audit: r[4].items }, null, 2));
        toast('D1 JSON backup downloaded', 'success');
      } catch (e) { toast(e.message, 'crimson'); }
    }

    async function load() {
      loading(host, 'Loading live counts…');
      try {
        var r = await Promise.all([
          api('GET', 'stats'),
          api('GET', 'jobs?limit=100'),
          api('GET', 'current-affairs?limit=100'),
          api('GET', 'mock-tests?limit=100'),
          api('GET', 'pages').catch(function () { return { total: 0, pages: [] }; }),
          api('GET', 'banner').catch(function () { return { active: false }; }),
          api('GET', 'maintenance').catch(function () { return {}; })
        ]);
        var s = r[0], jobs = r[1].items || [], cas = r[2].items || [], tests = r[3].items || [], pagesRes = r[4], banner = r[5] || {};
        var cron = (r[6] && r[6].last_cron_run) || s.last_cron_run;

        var jobDrafts = jobs.filter(function (x) { return x.status === 'draft'; }).length;
        var caDrafts = cas.filter(function (x) { return x.status === 'draft'; }).length;
        var testDrafts = tests.filter(function (x) { return x.status === 'draft'; }).length;

        // Symmetrical 8-Card (4x2) Launchpad Grid
        var cards = [
          ['Job Alerts', (s.jobs && s.jobs.total || 0) + ' total · ' + (s.jobs && s.jobs.live || 0) + ' live · ' + jobDrafts + ' draft', [['Create', function () { openContentComposer('jobs'); }, true], ['Manage', function () { window.selectModule('folder-05', 'module-05-008'); }]]],
          ['Current Affairs', (s.current_affairs && s.current_affairs.total || 0) + ' total · ' + (s.current_affairs && s.current_affairs.live || 0) + ' live · ' + caDrafts + ' draft', [['Create', function () { openContentComposer('current-affairs'); }, true], ['Manage', function () { window.selectModule('folder-04', 'module-04-004'); }]]],
          ['Mock Tests', (s.mock_tests && s.mock_tests.total || 0) + ' total · ' + (s.mock_tests && s.mock_tests.live || 0) + ' live · ' + testDrafts + ' draft', [['Create', function () { openContentComposer('mock-tests'); }, true], ['Manage', function () { window.selectModule('folder-05', 'module-05-014'); }]]],
          ['Live Pages & Broadcast', (pagesRes.total || (pagesRes.pages && pagesRes.pages.length) || 0) + ' routes · Banner: ' + (banner.active ? 'LIVE' : 'Inactive'), [['Edit & Preview Banner', function () { openBannerComposer(banner); }, true], ['All Pages', function () { window.selectModule('folder-02', 'module-02-001'); }]]],
          ['Question CSV/JSON Import', (s.mock_tests && s.mock_tests.total || 0) + ' tests · Dry-run + commit import', [['Open Mock Tests', function () { window.selectModule('folder-05', 'module-05-012'); }, true]]],
          ['R2 Media Upload', (s.media && s.media.total || 0) + ' assets · ' + Math.round((s.media && s.media.bytes || 0) / 1024) + ' KB', [['Upload File', function () { fileInp.click(); }, true], ['Library', function () { window.selectModule('folder-07', 'module-07-001'); }]]],
          ['D1 JSON Backup', 'Export live posts, tests, resources & audit', [['Download Backup', backup, true]]],
          ['Odisha Starter Content', 'Idempotent OPSC/OSSC/OSSSC jobs, digests, tests & syllabus', [['Seed Odisha Starter Content', async function () {
            try {
              var res = await api('POST', 'seed-odisha');
              var ins = res.inserted || {};
              var n = (ins.jobs || 0) + (ins.current_affairs || 0) + (ins.mock_tests || 0) + (ins.resources || 0);
              toast(n ? ('Seeded ' + n + ' Odisha starter records into D1!') : 'Starter content already present.', 'success');
              load();
            } catch (e) { toast(e.message, 'crimson'); }
          }, true]]]
        ];
        clear(host);
        host.appendChild(el('div', { class: 'cso-mod-grid-4' }, cards.map(function (c) {
          return el('div', { class: 'cso-mod-card' }, [
            el('h3', { text: c[0] }),
            el('p', { class: 'cso-mod-muted', text: c[1] }),
            el('div', { class: 'cso-mod-toolbar' }, c[2].map(function (b) {
              return el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm' + (b[2] ? ' cso-mod-btn-primary' : ''), text: b[0], onclick: b[1] });
            }))
          ]);
        })));

        var now = Date.now();
        var today = new Date().toISOString().slice(0, 10);
        var soon = jobs.filter(function (j) { return j.status === 'published' && j.last_date && Date.parse(j.last_date) - now < 7 * 86400000 && Date.parse(j.last_date) > now - 86400000; });
        var sched = jobs.map(function (j) { return Object.assign({ _kind: 'jobs' }, j); }).concat(cas.map(function (c) { return Object.assign({ _kind: 'current-affairs' }, c); })).filter(function (x) { return x.status === 'scheduled'; });

        clear(maint);
        var rawOpen = false;
        var rawBtn = el('button', {
          type: 'button',
          class: 'cso-mod-btn cso-mod-btn-sm',
          text: 'Inspect Raw JSON',
          onclick: function () {
            rawOpen = !rawOpen;
            diffPre.classList.toggle('cso-hidden', !rawOpen);
            if (rawOpen) diffPre.textContent = JSON.stringify(cron || { status: 'no run recorded yet' }, null, 2);
          }
        });

        maint.appendChild(el('div', { class: 'cso-drawer-head' }, [
          el('h3', { text: 'Scheduled Lifecycle & Maintenance' }),
          rawBtn
        ]));

        // Observable Telemetry Badges
        var cObj = (cron && typeof cron === 'object') ? cron : {};
        maint.appendChild(el('div', { class: 'cso-pill-row' }, [
          badge('Last Run: ' + (cObj.ran_at || cObj.at || 'Not yet run'), 'info'),
          badge('Actor: ' + (cObj.actor || 'system:cron'), 'info'),
          badge('Promoted: ' + (cObj.promoted || 0), 'ok'),
          badge('Expired: ' + (cObj.expired || 0), 'warn'),
          badge('Cleaned: ' + (cObj.cleaned || cObj.deleted || 0), 'info'),
          badge('Schedule: */15 * * * *', 'ok')
        ]));

        maint.appendChild(el('div', { class: 'cso-mod-grid-2' }, [
          el('div', {}, [
            el('h4', { text: 'Upcoming scheduled (' + sched.length + ')' }),
            safeTable(['Title', 'Publishes', 'Actions'], sched.slice(0, 8).map(function (x) {
              return el('tr', {}, [
                el('td', { text: x.title }),
                el('td', { text: x.published_at || '—' }),
                el('td', {}, el('div', { class: 'cso-mod-toolbar' }, [
                  el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Preview', onclick: function () { openRowPreview(x._kind, x); } }),
                  el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-primary cso-mod-btn-sm', text: 'Publish Now', onclick: async function () {
                    try { await api('POST', x._kind + '/' + encodeURIComponent(x.id) + '/status', { status: 'published' }); toast('Published live!', 'success'); load(); } catch (e) { toast(e.message, 'crimson'); }
                  } })
                ]))
              ]);
            }))
          ]),
          el('div', {}, [
            el('h4', { text: 'Expiring within 7 days (' + soon.length + ')' }),
            safeTable(['Title', 'Last date', 'Actions'], soon.slice(0, 8).map(function (x) {
              return el('tr', {}, [
                el('td', { text: x.title }),
                el('td', { text: x.last_date }),
                el('td', {}, el('div', { class: 'cso-mod-toolbar' }, [
                  el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Preview', onclick: function () { openRowPreview('jobs', x); } }),
                  el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Extend +7d', onclick: async function () {
                    try {
                      var full = await api('GET', 'jobs/' + encodeURIComponent(x.id));
                      var base = full.last_date ? new Date(full.last_date + 'T00:00:00Z') : new Date();
                      if (base.getTime() < now) base = new Date();
                      full.last_date = new Date(base.getTime() + 7 * 86400000).toISOString().slice(0, 10);
                      await api('PUT', 'jobs/' + encodeURIComponent(x.id), full);
                      toast('Extended to ' + full.last_date, 'success'); load();
                    } catch (e) { toast(e.message, 'crimson'); }
                  } })
                ]))
              ]);
            }))
          ])
        ]));

        clear(diffHost);
        var dryBtn = el('button', {
          type: 'button',
          class: 'cso-mod-btn',
          text: 'Preview Maintenance Impact (Dry-Run)',
          onclick: function () {
            var dueSched = sched.filter(function (x) { return x.published_at && Date.parse(x.published_at) <= now; });
            var pastJobs = jobs.filter(function (j) { return j.status === 'published' && j.last_date && j.last_date < today; });
            clear(diffHost);
            var impactRows = dueSched.map(function (x) {
              return el('tr', {}, [el('td', {}, badge('Promote', 'ok')), el('td', { text: x.title }), el('td', { text: 'scheduled → published' })]);
            }).concat(pastJobs.map(function (j) {
              return el('tr', {}, [el('td', {}, badge('Expire', 'warn')), el('td', { text: j.title }), el('td', { text: 'last_date ' + j.last_date + ' → expired' })]);
            }));
            diffHost.appendChild(el('div', { class: 'cso-drawer' }, [
              el('h4', { text: 'Dry-Run Maintenance Impact (' + impactRows.length + ' records affected)' }),
              impactRows.length ? safeTable(['Action', 'Record', 'Transition'], impactRows) : el('p', { class: 'cso-mod-muted', text: 'No due scheduled posts or expired jobs pending cleanup.' })
            ]));
          }
        });

        var runBtn = el('button', {
          type: 'button',
          class: 'cso-mod-btn cso-mod-btn-primary',
          text: 'Run Maintenance & Cleanup Now',
          onclick: async function () {
            try {
              var before = snap(await api('GET', 'stats'));
              var res = await api('POST', 'maintenance/run');
              var after = snap(await api('GET', 'stats'));
              clear(diffHost);
              var mRows = Object.keys(after).map(function (k) {
                var b = before[k] || 0, a = after[k] || 0;
                return el('tr', {}, [el('td', { text: k }), el('td', { text: String(b) }), el('td', { text: String(a) }), el('td', {}, badge((a - b >= 0 ? '+' : '') + (a - b), a !== b ? 'warn' : 'info'))]);
              });
              diffHost.appendChild(el('div', { class: 'cso-drawer' }, [
                el('h4', { text: 'Maintenance Execution Diff' }),
                safeTable(['Metric', 'Before', 'After', 'Delta'], mRows)
              ]));
              diffPre.classList.remove('cso-hidden');
              diffPre.textContent = JSON.stringify(res.last_cron_run || res, null, 2);
              toast('Maintenance complete', 'success');
            } catch (e) { toast(e.status === 403 ? 'Maintenance requires admin role' : e.message, 'crimson'); }
          }
        });

        maint.appendChild(el('div', { class: 'cso-mod-toolbar' }, [dryBtn, runBtn]));
        maint.appendChild(diffHost);
        maint.appendChild(diffPre);
      } catch (e) { fail(host, e); }
    }
    load();
  }

  function renderAuditTimeline(root, actions) {
    addHeaderPill(actions, '● Live Audit Timeline');
    var shell = el('div', { class: 'cso-mod-shell' });
    var kpiHost = el('div', { class: 'cso-mod-grid-4' });
    var cronBannerHost = el('div', {});
    var drawerHost = el('div', {});
    var host = el('div', {});
    var items = [], kind = 'All', hideNoOpCron = true;
    var q = el('input', { type: 'text', class: 'cso-mod-input', placeholder: 'Search action, route, summary, or actor…' });
    var actor = el('input', { type: 'text', class: 'cso-mod-input', placeholder: 'Filter by actor email…' });

    function parseMeta(a) {
      try { return JSON.parse(a.metadata_json || '{}') || {}; } catch (_) { return { raw: a.metadata_json }; }
    }

    function isNoOpCron(a) {
      if (a.action !== 'maintenance.run') return false;
      var m = parseMeta(a);
      return !m.promoted && !m.expired && !m.cleaned && !m.deleted;
    }

    function entityInfo(a) {
      var act = String(a.action || ''), tt = String(a.target_type || '');
      if (tt === 'site_pages' || /^page\./.test(act)) return { label: 'Page', kind: 'page' };
      if (/^banner/.test(act) || a.target_id === 'homepage_banner') return { label: 'Banner', kind: 'banner' };
      if (/^jobs?\./.test(act) || tt === 'job') return { label: 'Job', kind: 'jobs' };
      if (/^current-affairs\./.test(act) || tt === 'current_affair') return { label: 'Current Affair', kind: 'current-affairs' };
      if (/^mock/.test(act) || tt === 'mock_test') return { label: 'Mock Test', kind: 'mock-tests' };
      if (/^media/.test(act) || tt === 'media') return { label: 'Media', kind: 'media' };
      return { label: 'System', kind: 'system' };
    }

    function relTime(ts) {
      if (!ts) return '—';
      var t = Date.parse(String(ts).replace(' ', 'T') + (String(ts).indexOf('T') === -1 && String(ts).indexOf('Z') === -1 ? 'Z' : ''));
      if (isNaN(t)) return ts;
      var mins = Math.max(0, Math.floor((Date.now() - t) / 60000));
      if (mins < 1) return 'just now';
      if (mins < 60) return mins + 'm ago';
      var hrs = Math.floor(mins / 60);
      if (hrs < 24) return hrs + 'h ago';
      return Math.floor(hrs / 24) + 'd ago';
    }

    function humanSummary(a, meta) {
      var act = String(a.action || '');
      var tgt = a.target_id ? ' ' + a.target_id : '';
      if (act === 'maintenance.run') return 'Cron maintenance: ' + (meta.promoted || 0) + ' promoted, ' + (meta.expired || 0) + ' expired, ' + (meta.cleaned || 0) + ' cleaned';
      if (act === 'page.create' || act === 'page.update') return (act === 'page.create' ? 'Created' : 'Updated') + ' page' + tgt + (meta.status ? ' (' + meta.status + ')' : '');
      if (act === 'page.restore') return 'Restored page' + tgt + (meta.revision_id ? ' from rev #' + meta.revision_id : '');
      if (act === 'banner.publish') return 'Published homepage banner: "' + (meta.headline || 'Live') + '"';
      if (act === 'banner.deactivate') return 'Deactivated homepage banner';
      if (act === 'seed.odisha') return 'Seeded Odisha starter content pack into D1';
      if (act === 'user.role_change') return 'Changed role for ' + (meta.email || tgt) + ' (' + (meta.from || '?') + ' → ' + (meta.to || '?') + ')';
      return act + tgt + (meta.title ? ' — ' + meta.title : '');
    }

    function match(a) {
      if (hideNoOpCron && isNoOpCron(a)) return false;
      var act = String(a.action || '');
      if (kind === 'Create' && !/create/.test(act)) return false;
      if (kind === 'Update' && !/update|role_change|deactivate|resolved/.test(act)) return false;
      if (kind === 'Publish' && !/publish/.test(act)) return false;
      if (kind === 'Delete' && !/delete/.test(act)) return false;
      if (kind === 'Cron/System' && !(/maintenance|cron|seed/.test(act) || !a.actor_email)) return false;
      if (actor.value && !String(a.actor_email || 'system').toLowerCase().includes(actor.value.toLowerCase())) return false;
      var s = q.value.toLowerCase();
      if (!s) return true;
      var meta = parseMeta(a);
      return act.toLowerCase().includes(s) ||
        String(a.actor_email || '').toLowerCase().includes(s) ||
        String(a.target_id || '').toLowerCase().includes(s) ||
        humanSummary(a, meta).toLowerCase().includes(s);
    }

    function jump(a) {
      var act = String(a.action || '');
      var map = [[/^page\./, ['folder-02', 'module-02-001']], [/^jobs?\./, ['folder-05', 'module-05-008']], [/^current-affairs\./, ['folder-04', 'module-04-004']], [/^mock/, ['folder-05', 'module-05-014']], [/^banner/, ['folder-02', 'module-02-004']], [/^resource/, ['folder-05', 'module-05-010']], [/^user/, ['folder-09', 'module-09-001']], [/^incident/, ['folder-16', 'module-16-013']]];
      for (var i = 0; i < map.length; i++) if (map[i][0].test(act)) return map[i][1];
      return null;
    }

    function exportAudit(fmt) {
      var shown = items.filter(match);
      if (fmt === 'json') {
        downloadFile('cso-audit-' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify(shown, null, 2));
        toast('Exported ' + shown.length + ' audit events (JSON)', 'success');
        return;
      }
      var escCsv = function (v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; };
      var lines = ['id,action,target_type,target_id,actor_email,ip_address,created_at,summary'];
      shown.forEach(function (a) {
        lines.push([a.id, a.action, a.target_type, a.target_id, a.actor_email || 'system', a.ip_address || '', a.created_at, humanSummary(a, parseMeta(a))].map(escCsv).join(','));
      });
      downloadFile('cso-audit-' + new Date().toISOString().slice(0, 10) + '.csv', lines.join('\n'), 'text/csv');
      toast('Exported ' + shown.length + ' audit events (CSV)', 'success');
    }

    async function openInspector(a) {
      clear(drawerHost);
      var meta = parseMeta(a);
      var ent = entityInfo(a);
      var j = jump(a);
      var rawOpen = false;
      var rawPre = el('pre', { class: 'cso-code-pre cso-hidden', text: JSON.stringify({ event: a, metadata: meta }, null, 2) });

      // Build structured Before / After diff
      var diffRows = [];
      if (meta.before && meta.after && typeof meta.before === 'object' && typeof meta.after === 'object') {
        var keys = Object.keys(Object.assign({}, meta.before, meta.after));
        keys.forEach(function (k) {
          var bv = JSON.stringify(meta.before[k] !== undefined ? meta.before[k] : '—');
          var av = JSON.stringify(meta.after[k] !== undefined ? meta.after[k] : '—');
          diffRows.push([k, bv, av, bv !== av]);
        });
      } else if (meta.from !== undefined || meta.to !== undefined) {
        diffRows.push(['value', String(meta.from || '—'), String(meta.to || '—'), meta.from !== meta.to]);
      } else {
        Object.keys(meta).forEach(function (k) {
          diffRows.push([k, '—', typeof meta[k] === 'object' ? JSON.stringify(meta[k]) : String(meta[k]), true]);
        });
      }

      var diffColBefore = el('div', { class: 'cso-diff-col' }, [el('h4', { text: 'Before / Context' })]);
      var diffColAfter = el('div', { class: 'cso-diff-col' }, [el('h4', { text: 'After / Recorded Payload' })]);
      if (!diffRows.length) {
        diffColBefore.appendChild(el('p', { class: 'cso-mod-muted', text: 'No field-level diff recorded.' }));
        diffColAfter.appendChild(el('p', { class: 'cso-mod-muted', text: a.action }));
      } else {
        diffRows.forEach(function (r) {
          diffColBefore.appendChild(el('div', { class: 'cso-diff-row' + (r[3] ? ' cso-diff-changed' : ''), text: r[0] + ': ' + r[1] }));
          diffColAfter.appendChild(el('div', { class: 'cso-diff-row' + (r[3] ? ' cso-diff-changed' : ''), text: r[0] + ': ' + r[2] }));
        });
      }

      var previewHost = el('div', { class: 'cso-mod-shell' });
      if (ent.kind === 'page' || ent.kind === 'banner') {
        var targetRoute = ent.kind === 'banner' ? '/' : f02NormalizeRoute(a.target_id || '/');
        previewHost.appendChild(el('div', { class: 'cso-preview-frame-wrap' }, [
          el('iframe', { src: targetRoute + '?preview=1&t=' + Date.now(), class: 'cso-preview-frame', title: 'Live Target Preview' })
        ]));
      } else if (ent.kind === 'jobs' || ent.kind === 'current-affairs' || ent.kind === 'mock-tests') {
        previewHost.appendChild(el('div', { class: 'cso-preview-card-desktop' }, [
          badge(ent.label, 'info'),
          el('h4', { text: meta.title || a.target_id || a.action }),
          el('p', { class: 'cso-mod-muted', text: humanSummary(a, meta) })
        ]));
        if (a.target_id) {
          api('GET', ent.kind + '/' + encodeURIComponent(a.target_id)).then(function (rec) {
            clear(previewHost);
            previewHost.appendChild(el('div', { class: 'cso-preview-card-desktop' }, [
              el('div', { class: 'cso-inline-row' }, [badge(ent.label, 'info'), badge(rec.status || 'draft', rec.status === 'published' ? 'ok' : 'warn')]),
              el('h4', { text: rec.title || a.target_id }),
              el('p', { class: 'cso-mod-muted', text: (rec.organisation || rec.category || rec.target_exam || '') + ' · ' + (rec.last_date || rec.event_date || '') }),
              el('p', { text: rec.summary || 'No summary recorded.' })
            ]));
          }).catch(function () {});
        }
      } else {
        previewHost.appendChild(el('p', { class: 'cso-mod-muted', text: humanSummary(a, meta) }));
      }

      var actionBar = el('div', { class: 'cso-mod-toolbar' });
      if (j) {
        actionBar.appendChild(el('button', {
          type: 'button',
          class: 'cso-mod-btn cso-mod-btn-sm',
          text: 'Edit Target Record',
          onclick: function () {
            if (ent.kind === 'page' && a.target_id) f02State.builderRoute = a.target_id;
            window.selectModule && window.selectModule(j[0], ent.kind === 'page' ? 'module-02-003' : j[1]);
          }
        }));
      }
      if (ent.kind === 'page' && a.target_id) {
        actionBar.appendChild(el('button', {
          type: 'button',
          class: 'cso-mod-btn cso-mod-btn-primary cso-mod-btn-sm',
          text: 'Publish / Re-Publish Live',
          onclick: async function () {
            try {
              await api('PUT', 'pages', { route: a.target_id, status: 'published', note: 'Re-published from Audit Inspector' });
              toast('Re-published live: ' + a.target_id, 'success');
              load();
            } catch (e) { toast(e.message, 'crimson'); }
          }
        }));
        actionBar.appendChild(el('button', {
          type: 'button',
          class: 'cso-mod-btn cso-mod-btn-sm',
          text: 'Restore Latest Snapshot',
          onclick: async function () {
            try {
              var revs = await api('GET', 'pages/revisions?route=' + encodeURIComponent(a.target_id));
              var latest = (revs.revisions || [])[0];
              if (!latest) { toast('No revision snapshot found for ' + a.target_id, 'amber'); return; }
              await api('POST', 'pages/restore', { route: a.target_id, revision_id: latest.id, status: 'published' });
              toast('Restored snapshot #' + latest.id + ' live!', 'success');
              load();
            } catch (e) { toast(e.message, 'crimson'); }
          }
        }));
      } else if ((ent.kind === 'jobs' || ent.kind === 'current-affairs' || ent.kind === 'mock-tests') && a.target_id) {
        actionBar.appendChild(el('button', {
          type: 'button',
          class: 'cso-mod-btn cso-mod-btn-primary cso-mod-btn-sm',
          text: 'Publish / Re-Publish Live',
          onclick: async function () {
            try {
              await api('POST', ent.kind + '/' + encodeURIComponent(a.target_id) + '/status', { status: 'published' });
              toast('Published live!', 'success');
              load();
            } catch (e) { toast(e.message, 'crimson'); }
          }
        }));
      }
      actionBar.appendChild(el('button', {
        type: 'button',
        class: 'cso-mod-btn cso-mod-btn-sm',
        text: 'Raw JSON',
        onclick: function () { rawOpen = !rawOpen; rawPre.classList.toggle('cso-hidden', !rawOpen); }
      }));

      drawerHost.appendChild(el('div', { class: 'cso-drawer' }, [
        el('div', { class: 'cso-drawer-head' }, [
          el('div', { class: 'cso-inline-row' }, [
            badge(ent.label, 'info'),
            badge(a.action, /delete/.test(a.action) ? 'err' : /publish|create/.test(a.action) ? 'ok' : 'info'),
            el('strong', { text: humanSummary(a, meta) })
          ]),
          el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Close', onclick: function () { clear(drawerHost); } })
        ]),
        el('p', { class: 'cso-mod-muted', text: 'Actor: ' + (a.actor_email || 'system:cron') + ' · IP: ' + (a.ip_address || '—') + ' · Time: ' + (a.created_at || '—') }),
        actionBar,
        el('div', { class: 'cso-mod-grid-2' }, [
          el('div', { class: 'cso-mod-shell' }, [
            el('h4', { text: 'Structured Field Diff' }),
            el('div', { class: 'cso-diff-grid' }, [diffColBefore, diffColAfter]),
            rawPre
          ]),
          el('div', { class: 'cso-mod-shell' }, [
            el('h4', { text: 'On-Demand Target Preview' }),
            previewHost
          ])
        ])
      ]));
    }

    function draw() {
      var noOpCount = items.filter(isNoOpCron).length;
      var cronCount = items.filter(function (a) { return a.action === 'maintenance.run'; }).length;
      var editorialCount = items.length - cronCount;
      var publishCount = items.filter(function (a) { return /publish|page\.|banner\./.test(String(a.action || '')); }).length;

      clear(kpiHost);
      [
        ['Total Logged Events', items.length],
        ['Editorial & Admin Actions', editorialCount],
        ['Live Publishes & Deploys', publishCount],
        ['Automated Cron Runs', cronCount]
      ].forEach(function (k) { kpiHost.appendChild(kpiBox(String(k[1]), k[0])); });

      clear(cronBannerHost);
      var togglePill = el('button', {
        type: 'button',
        class: 'cso-pill' + (hideNoOpCron ? ' is-active' : ''),
        text: (hideNoOpCron ? '✓ ' : '') + 'Hide No-Op Cron Heartbeats (maintenance.run) · ' + noOpCount + ' collapsed',
        onclick: function () { hideNoOpCron = !hideNoOpCron; draw(); }
      });
      var latestCron = items.find(function (a) { return a.action === 'maintenance.run'; });
      cronBannerHost.appendChild(el('div', { class: 'cso-mod-card' }, [
        el('div', { class: 'cso-drawer-head' }, [
          togglePill,
          el('span', { class: 'cso-mod-muted', text: latestCron ? ('Latest Cron Heartbeat: ' + relTime(latestCron.created_at) + ' (' + latestCron.created_at + ')') : 'No cron runs logged' })
        ])
      ]));

      clear(host);
      var shown = items.filter(match);
      host.appendChild(el('p', { class: 'cso-mod-muted', text: 'Showing ' + shown.length + ' of ' + items.length + ' events. Click any row to inspect diff & preview.' }));
      if (!shown.length) {
        host.appendChild(el('p', { class: 'cso-mod-muted', text: 'No matching audit events (try toggling off the cron heartbeat filter or clearing search).' }));
        return;
      }
      var rows = shown.map(function (a) {
        var meta = parseMeta(a);
        var ent = entityInfo(a);
        return el('tr', {}, [
          el('td', {}, [badge(ent.label, 'info'), ' ', badge(a.action, /delete/.test(a.action) ? 'err' : /publish|create/.test(a.action) ? 'ok' : 'info')]),
          el('td', { text: humanSummary(a, meta) }),
          el('td', {}, badge(a.actor_email || 'system:cron', a.actor_email ? 'info' : 'warn')),
          el('td', { text: relTime(a.created_at) + ' (' + (a.created_at || '—') + ')' }),
          el('td', {}, el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm cso-mod-btn-primary', text: 'Inspect & Preview', onclick: function () { openInspector(a); } }))
        ]);
      });
      host.appendChild(safeTable(['Entity & Action', 'Summary', 'Actor', 'Time', 'Inspect'], rows));
    }

    renderBanner(shell, 'Live Audit Timeline & Diff Inspector', 'Observable audit stream with no-op cron noise suppression, structured diffs, and live target previews.', [
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'Export JSON', onclick: function () { exportAudit('json'); } }),
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'Export CSV', onclick: function () { exportAudit('csv'); } }),
      el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-primary', text: 'Reload', onclick: load })
    ]);
    shell.appendChild(kpiHost);
    shell.appendChild(cronBannerHost);
    shell.appendChild(pills(['All', 'Create', 'Update', 'Publish', 'Delete', 'Cron/System'], function (k) { kind = k; draw(); }));
    shell.appendChild(el('div', { class: 'cso-mod-grid-2' }, [q, actor]));
    shell.appendChild(drawerHost);
    shell.appendChild(el('div', { class: 'cso-mod-card' }, [host]));
    root.appendChild(shell);

    q.addEventListener('input', draw);
    actor.addEventListener('input', draw);

    async function load() {
      loading(host, 'Loading audit log…');
      try { items = (await api('GET', 'audit?limit=100')).items || []; draw(); } catch (e) { fail(host, e); }
    }
    load();
  }

  /* =========================================================================
     COMMAND CENTRE 5-8: Alerts, Approval Queue, Analytics Studio, Command Directory
     ========================================================================= */
  function barChart(rows, label) {
    var max = Math.max.apply(null, rows.map(function (r) { return r.value; }).concat([1]));
    var g = svg('svg', { viewBox: '0 0 600 ' + (rows.length * 22 + 6), class: 'cso-bar-svg', role: 'img', 'aria-label': label });
    rows.forEach(function (r, i) {
      var w = Math.max(2, (r.value / max) * 320);
      var t1 = svg('text', { x: 0, y: i * 22 + 15, class: 'cso-bar-lbl' }); t1.textContent = String(r.label).slice(0, 30);
      var t2 = svg('text', { x: 206 + w, y: i * 22 + 15, class: 'cso-bar-lbl' }); t2.textContent = r.text || String(r.value);
      g.appendChild(t1);
      g.appendChild(svg('rect', { x: 200, y: i * 22 + 4, width: w.toFixed(1), height: 14, rx: 3, class: r.cls || 'cso-bar-ok' }));
      g.appendChild(t2);
    });
    return rows.length ? g : el('p', { class: 'cso-mod-muted', text: 'No live data to chart yet.' });
  }
  function csvCell(v) { return '"' + String(v === null || v === undefined ? '' : v).replace(/"/g, '""') + '"'; }
  var MOD_FOLDER = { jobs: ['folder-05', 'module-05-008'], 'current-affairs': ['folder-04', 'module-04-004'], 'mock-tests': ['folder-05', 'module-05-014'] };
  function goTo(pair) { if (pair && window.selectModule) window.selectModule(pair[0], pair[1]); }

  function renderAlertCenter(root, actions) {
    addHeaderPill(actions, '● Live Alert & Broadcast Center');
    var shell = el('div', { class: 'cso-mod-shell' });
    var kpiHost = el('div', { class: 'cso-mod-grid-4' });
    var previewDrawer = el('div', {});
    var host = el('div', { class: 'cso-mod-shell' });
    var sev = 'All', alerts = [], acked = {}, currentBanner = {};
    try { acked = JSON.parse(localStorage.getItem('cso_ack_alerts') || '{}'); } catch (_) { acked = {}; }
    renderBanner(shell, 'Administrative Notifications', 'Actionable alerts computed live from D1, health probes, and the sitewide broadcast banner (/api/admin/banner).', [
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'Refresh', onclick: load })
    ]);
    shell.appendChild(kpiHost);
    shell.appendChild(pills(['All', 'Critical', 'Warning', 'Info'], function (s) { sev = s; draw(); }));
    shell.appendChild(previewDrawer);
    shell.appendChild(host);
    root.appendChild(shell);
    var alertHost = el('div', {}), composerHost = el('div', {});
    host.appendChild(alertHost); host.appendChild(composerHost);

    function btn(text, fn, primary) {
      return el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm' + (primary ? ' cso-mod-btn-primary' : ''), text: text, onclick: fn });
    }

    function openTargetPreview(a) {
      clear(previewDrawer);
      var bodyNode;
      if (a.previewRoute) {
        bodyNode = el('div', { class: 'cso-preview-frame-wrap' }, [
          el('iframe', { src: a.previewRoute + '?preview=1&t=' + Date.now(), class: 'cso-preview-frame', title: 'Alert Target Preview' })
        ]);
      } else {
        bodyNode = el('div', { class: 'cso-preview-card-desktop' }, [
          el('div', { class: 'cso-inline-row' }, [badge(a.sev, a.sev === 'Critical' ? 'err' : a.sev === 'Warning' ? 'warn' : 'info'), badge(a.kindLabel || 'Alert', 'info')]),
          el('h4', { text: a.title || a.msg }),
          el('p', { class: 'cso-mod-muted', text: a.detail || a.msg })
        ]);
      }
      previewDrawer.appendChild(el('div', { class: 'cso-drawer' }, [
        el('div', { class: 'cso-drawer-head' }, [
          el('strong', { text: 'Target Preview — ' + (a.title || a.msg) }),
          el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Close', onclick: function () { clear(previewDrawer); } })
        ]),
        bodyNode
      ]));
    }

    function renderKpis() {
      clear(kpiHost);
      var critCount = alerts.filter(function (a) { return a.sev === 'Critical' || /closing/i.test(a.msg); }).length;
      var ackCount = alerts.filter(function (a) { return !!acked[a.id]; }).length;
      var bStatus = currentBanner.active ? 'LIVE' : 'OFFLINE';
      var bTime = currentBanner.updatedAt ? ('Updated ' + currentBanner.updatedAt) : 'Not published yet';
      [
        ['Active Alerts', String(alerts.length), 'Across D1 & Edge'],
        ['Critical / Expiring <72h', String(critCount), 'Needs immediate action'],
        ['Acknowledged Alerts', String(ackCount), 'Tracked in session'],
        ['Sitewide Broadcast', bStatus, bTime]
      ].forEach(function (k) {
        kpiHost.appendChild(el('div', { class: 'cso-mod-kpi' }, [
          el('div', { class: 'cso-mod-kpi-val', text: k[1] }),
          el('div', { class: 'cso-mod-kpi-lbl', text: k[0] }),
          el('div', { class: 'cso-mod-muted', text: k[2] })
        ]));
      });
    }

    function draw() {
      renderKpis();
      clear(alertHost);
      var shown = alerts.filter(function (a) { return sev === 'All' || a.sev.toLowerCase() === sev.toLowerCase(); });
      if (!shown.length) {
        alertHost.appendChild(el('div', { class: 'cso-mod-card' }, [
          el('div', { class: 'cso-drawer-head' }, [
            el('h3', { text: 'All Clear — Zero Unresolved Alerts' }),
            badge('Healthy', 'ok')
          ]),
          el('p', { class: 'cso-mod-muted', text: 'No active critical warnings, expiring jobs, or edge health failures match this filter.' }),
          el('div', { class: 'cso-mod-toolbar' }, [
            btn('Open Live Site Status', function () { window.selectModule && window.selectModule('folder-01', 'module-01-002'); }, true),
            btn('Open Quick Actions', function () { window.selectModule && window.selectModule('folder-01', 'module-01-003'); }, false)
          ])
        ]));
        return;
      }
      var rows = shown.map(function (a) {
        var done = !!acked[a.id];
        var rowBtns = [btn('Preview Target', function () { openTargetPreview(a); }, false)].concat(a.actions || []);
        return el('tr', {}, [
          el('td', {}, badge(a.sev, a.sev === 'Critical' ? 'err' : a.sev === 'Warning' ? 'warn' : 'info')),
          el('td', { text: a.msg }),
          el('td', {}, el('label', { class: 'cso-check-label' }, [
            el('input', {
              type: 'checkbox',
              checked: done ? true : false,
              onchange: function (e) {
                if (e.target.checked) acked[a.id] = 1; else delete acked[a.id];
                try { localStorage.setItem('cso_ack_alerts', JSON.stringify(acked)); } catch (_) {}
                renderKpis();
              }
            }),
            el('span', { text: done ? 'Acked' : 'Ack' })
          ])),
          el('td', {}, el('div', { class: 'cso-mod-toolbar' }, rowBtns))
        ]);
      });
      alertHost.appendChild(el('div', { class: 'cso-mod-card' }, [
        el('h3', { text: 'Actionable Alerts (' + shown.length + ')' }),
        safeTable(['Severity', 'Alert', 'Acknowledge', 'Preview & Resolve'], rows)
      ]));
    }

    function composer(b) {
      clear(composerHost);
      var head = el('input', { type: 'text', class: 'cso-mod-input', value: b.headline || '', maxlength: '160', placeholder: 'e.g. OPSC OCS 2026 Admit Card Released' });
      var ctx = el('textarea', { class: 'cso-mod-textarea', maxlength: '300', placeholder: 'Supporting context for aspirants…' }); ctx.value = b.context || '';
      var cta = el('input', { type: 'text', class: 'cso-mod-input', value: b.ctaText || '', maxlength: '40', placeholder: 'Open Portal' });
      var url = el('input', { type: 'text', class: 'cso-mod-input', value: b.ctaUrl || '', placeholder: '/jobs-careers/' });
      var sevSel = el('select', { class: 'cso-mod-select' }, ['info', 'notice', 'urgent'].map(function (s) { return el('option', { value: s, text: s }); }));
      sevSel.value = b.severity || 'info';
      var act = el('input', { type: 'checkbox' }); act.checked = !!b.active;

      var mode = 'strip'; // 'strip' | 'iframe'
      var mobile = false;
      var prev = el('div', { class: 'cso-banner-preview' });
      var frameWrap = el('div', { class: 'cso-preview-frame-wrap cso-hidden' });
      var frame = el('iframe', { src: '/?preview=1&t=' + Date.now(), class: 'cso-preview-frame', title: 'Live Homepage Preview' });
      frameWrap.appendChild(frame);

      var modeStripBtn = el('button', { type: 'button', class: 'cso-pill is-active', text: 'Banner Strip Preview', onclick: function () { mode = 'strip'; syncMode(); } });
      var modeIframeBtn = el('button', { type: 'button', class: 'cso-pill', text: 'Live Homepage (/) + Overlay', onclick: function () { mode = 'iframe'; syncMode(); } });
      var vpBtn = el('button', {
        type: 'button',
        class: 'cso-mod-btn cso-mod-btn-sm',
        text: 'Mobile 375px',
        onclick: function () {
          mobile = !mobile;
          frame.className = mobile ? 'cso-preview-frame-mobile' : 'cso-preview-frame';
          vpBtn.textContent = mobile ? 'Desktop 100%' : 'Mobile 375px';
        }
      });

      function syncMode() {
        modeStripBtn.className = 'cso-pill' + (mode === 'strip' ? ' is-active' : '');
        modeIframeBtn.className = 'cso-pill' + (mode === 'iframe' ? ' is-active' : '');
        frameWrap.classList.toggle('cso-hidden', mode !== 'iframe');
      }

      function paint() {
        clear(prev);
        prev.className = 'cso-banner-preview cso-banner-' + sevSel.value + (act.checked ? '' : ' is-off');
        prev.appendChild(el('strong', { text: head.value || '(headline)' }));
        prev.appendChild(el('span', { text: ' ' + ctx.value }));
        if (cta.value) prev.appendChild(el('span', { class: 'cso-mod-badge cso-mod-badge-info', text: cta.value + ' → ' + (url.value || '/') }));
        if (!act.checked) prev.appendChild(el('em', { class: 'cso-mod-muted', text: ' (unpublished preview)' }));
      }

      [head, ctx, cta, url].forEach(function (i) { i.addEventListener('input', paint); });
      sevSel.addEventListener('change', paint);
      act.addEventListener('change', paint);

      var PRESETS = [
        ['OPSC Exam Alert', { headline: 'OPSC OCS 2026 Prelims Schedule Released', context: 'Download official timetable and exam centre instructions.', severity: 'notice', ctaText: 'View Schedule', ctaUrl: '/jobs-careers/' }],
        ['OSSC Last Date Warning', { headline: 'OSSC CGLRE 2026 — Final 48 Hours to Apply', context: 'Complete online registration before portal closes.', severity: 'urgent', ctaText: 'Apply Now', ctaUrl: '/jobs-careers/' }],
        ['Live CBT Mock Test Launch', { headline: 'Free Odisha GK & GS CBT Mock Test Now Live', context: 'Attempt timed bilingual practice test with instant rank.', severity: 'info', ctaText: 'Start CBT', ctaUrl: '/mock-tests/' }],
        ['Clear Form', { headline: '', context: '', severity: 'info', ctaText: '', ctaUrl: '' }]
      ];
      var presetBar = el('div', { class: 'cso-pill-row' }, PRESETS.map(function (pr) {
        return el('button', {
          type: 'button',
          class: 'cso-pill',
          text: pr[0],
          onclick: function () {
            head.value = pr[1].headline;
            ctx.value = pr[1].context;
            sevSel.value = pr[1].severity;
            cta.value = pr[1].ctaText;
            url.value = pr[1].ctaUrl;
            paint();
          }
        });
      }));

      async function saveBanner(activeFlag) {
        try {
          await api('PUT', 'banner', { active: activeFlag, severity: sevSel.value, headline: head.value.trim(), context: ctx.value.trim(), ctaText: cta.value.trim(), ctaUrl: url.value.trim() });
          toast(activeFlag ? 'Homepage Banner published live!' : 'Banner saved offline (unpublished)', 'success');
          load();
        } catch (e) { toast(e.message, 'crimson'); }
      }

      composerHost.appendChild(el('div', { class: 'cso-mod-grid-2' }, [
        el('div', { class: 'cso-mod-card' }, [
          el('h3', { text: 'Broadcast Banner Composer' }),
          presetBar,
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Headline' }), head]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Context' }), ctx]),
          el('div', { class: 'cso-mod-grid-3' }, [
            el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Severity' }), sevSel]),
            el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Button text' }), cta]),
            el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Button link' }), url])
          ]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-check-label' }, [act, el('span', { text: 'Active on homepage' })])]),
          el('div', { class: 'cso-mod-toolbar' }, [
            el('button', { type: 'button', class: 'cso-mod-btn', text: 'Save Draft (Unpublished)', onclick: function () { saveBanner(false); } }),
            el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-primary', text: 'Save & Publish Live', onclick: function () { saveBanner(true); } }),
            el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-danger', text: 'Take Banner Offline', onclick: function () { saveBanner(false); } })
          ])
        ]),
        el('div', { class: 'cso-mod-card' }, [
          el('div', { class: 'cso-drawer-head' }, [
            el('h3', { text: 'Real-Time Candidate Preview' }),
            vpBtn
          ]),
          el('div', { class: 'cso-pill-row' }, [modeStripBtn, modeIframeBtn]),
          prev,
          frameWrap,
          el('p', { class: 'cso-mod-muted', text: 'Last updated: ' + (b.updatedAt || 'never') })
        ])
      ]));
      paint();
      syncMode();
    }

    async function load() {
      loading(alertHost, 'Aggregating alerts…');
      try {
        var r = await Promise.all([api('GET', 'stats'), api('GET', 'jobs?limit=100'), api('GET', 'current-affairs?limit=100'), api('GET', 'mock-tests?limit=100'), api('GET', 'banner')]);
        var stats = r[0], jobs = r[1].items || [], cas = r[2].items || [], tests = r[3].items || [], now = Date.now();
        currentBanner = r[4] || {};
        alerts = [];
        jobs.forEach(function (j) {
          if (j.status !== 'published' || !j.last_date) return;
          var left = Date.parse(j.last_date + 'T23:59:59+05:30') - now;
          if (left > 0 && left < 72 * 3600000) alerts.push({
            id: 'exp-' + j.id, sev: left < 24 * 3600000 ? 'Critical' : 'Warning',
            kindLabel: 'Expiring Job', title: j.title, detail: (j.organisation || 'Odisha') + ' · Closes ' + j.last_date,
            msg: 'Job closing ' + j.last_date + ': ' + j.title,
            actions: [btn('Extend +7d', async function () { try { var f = await api('GET', 'jobs/' + encodeURIComponent(j.id)); f.last_date = new Date(Date.parse(f.last_date) + 7 * 86400000).toISOString().slice(0, 10); await api('PUT', 'jobs/' + encodeURIComponent(j.id), f); toast('Extended', 'success'); load(); } catch (e) { toast(e.message, 'crimson'); } }, true), btn('Edit', function () { goTo(MOD_FOLDER.jobs); })]
          });
        });
        jobs.concat(cas).forEach(function (x) {
          if (x.status === 'draft') {
            var k = x.type === 'job' ? 'jobs' : 'current-affairs';
            alerts.push({
              id: 'draft-' + x.id, sev: 'Info', kindLabel: 'Unpublished Draft', title: x.title, detail: x.summary || 'Pending editorial approval.',
              msg: 'Draft awaiting review (' + (k === 'jobs' ? 'Job' : 'Current Affairs') + '): ' + x.title,
              actions: [btn('Review', function () { window.selectModule('folder-01', 'module-01-006'); }, true), btn('Edit', function () { goTo(MOD_FOLDER[k]); })]
            });
          } else if (x.status === 'scheduled' && x.published_at && Date.parse(x.published_at) - now < 24 * 3600000) {
            alerts.push({
              id: 'sched-' + x.id, sev: 'Info', kindLabel: 'Scheduled <24h', title: x.title, detail: 'Scheduled for ' + x.published_at,
              msg: 'Scheduled item due within 24h: ' + x.title,
              actions: [btn('Open Schedule', function () { window.selectModule('folder-02', 'module-02-010'); }, true)]
            });
          }
        });
        tests.forEach(function (t) {
          if (!t.question_count) alerts.push({
            id: 'noq-' + t.id, sev: t.status === 'published' ? 'Critical' : 'Warning',
            kindLabel: 'Mock Test', title: t.title, detail: '0 questions attached (' + t.status + ')',
            msg: 'Mock test has 0 questions (' + t.status + '): ' + t.title,
            actions: [btn('Add Questions', function () { goTo(MOD_FOLDER['mock-tests']); }, true)]
          });
        });
        if (stats.open_incidents) alerts.push({
          id: 'incidents', sev: 'Critical', kindLabel: 'Incident', title: 'Open Incidents', detail: stats.open_incidents + ' unresolved incident(s).',
          msg: stats.open_incidents + ' open incident(s) unresolved',
          actions: [btn('Open Incidents', function () { window.selectModule('folder-16', 'module-16-013'); }, true)]
        });
        if (!currentBanner.active) {
          alerts.push({
            id: 'banner-offline', sev: 'Info', kindLabel: 'Broadcast Banner', title: 'Homepage Broadcast Banner Offline',
            previewRoute: '/', msg: 'Homepage broadcast banner is currently OFFLINE.',
            actions: [btn('Compose Below', function () { composerHost.scrollIntoView(); }, true)]
          });
        } else {
          alerts.push({
            id: 'banner-live', sev: 'Info', kindLabel: 'Broadcast Banner', title: currentBanner.headline,
            previewRoute: '/', msg: 'Homepage broadcast is LIVE: ' + currentBanner.headline,
            actions: [btn('Edit Below', function () { composerHost.scrollIntoView(); }, false)]
          });
        }
        var cron = stats.last_cron_run, ran = cron && (cron.ran_at || cron.at);
        if (!ran) alerts.push({ id: 'cron', sev: 'Warning', kindLabel: 'Cron', msg: 'No cron run recorded yet', actions: [btn('Maintenance', function () { window.selectModule('folder-01', 'module-01-003'); }, true)] });
        else if (Date.now() - Date.parse(String(ran).replace(' ', 'T') + (/Z|\+/.test(String(ran)) ? '' : 'Z')) > 3600000) alerts.push({ id: 'cron-stale', sev: 'Warning', kindLabel: 'Cron', msg: 'Last cron run is over 1 hour old (' + ran + ')', actions: [btn('Maintenance', function () { window.selectModule('folder-01', 'module-01-003'); }, true)] });
        var health = await Promise.all(['/', '/api/health', '/sitemap.xml', '/feed.xml'].map(async function (p) {
          try {
            var x = await fetch(p, { cache: 'no-store' });
            var cspMissing = p === '/' && !x.headers.get('content-security-policy');
            return [p, x.ok && !cspMissing, cspMissing ? 'Missing CSP header' : ('HTTP ' + x.status)];
          } catch (_) { return [p, false, 'Fetch error']; }
        }));
        health.forEach(function (h) {
          if (!h[1]) alerts.push({
            id: 'health-' + h[0], sev: 'Critical', kindLabel: 'Edge / CSP', previewRoute: h[0],
            msg: 'Edge/CSP check failed on ' + h[0] + ' (' + h[2] + ')',
            actions: [btn('Open Site Status', function () { window.selectModule('folder-01', 'module-01-002'); }, true)]
          });
        });
        var order = { Critical: 0, Warning: 1, Info: 2 };
        alerts.sort(function (a, b) { return order[a.sev] - order[b.sev]; });
        draw(); composer(currentBanner);
      } catch (e) { fail(alertHost, e); }
    }
    load();
  }

  function renderApprovalQueue(root, actions) {
    addHeaderPill(actions, '● Editorial Review & Approval');
    var shell = el('div', { class: 'cso-mod-shell' });
    var kpiHost = el('div', { class: 'cso-mod-kpis' });
    var filterHost = el('div', { class: 'cso-mod-shell' });
    var drawer = el('div', { class: 'cso-drawer cso-hidden' });
    var tableHost = el('div', {});
    var all = [], typeF = 'All', statF = 'All', selected = {};
    var NAMES = { jobs: 'Jobs', 'current-affairs': 'Current Affairs', 'mock-tests': 'Mock Tests', resources: 'Resources', pages: 'Pages' };

    renderBanner(shell, 'Pending Approvals — Editorial Review Queue', 'Unified pre-publish review queue across Jobs, Current Affairs, Mock Tests, Resources & Website Pages.', [
      el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-primary', text: 'Bulk Approve & Publish', onclick: bulkApprove }),
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'Bulk Archive', onclick: bulkArchive }),
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'Refresh', onclick: load })
    ]);
    shell.appendChild(kpiHost);
    filterHost.appendChild(pills(['All', 'Jobs', 'Current Affairs', 'Mock Tests', 'Resources', 'Pages'], function (t) { typeF = t; draw(); }));
    filterHost.appendChild(pills(['All', 'draft', 'scheduled'], function (s) { statF = s; draw(); }));
    shell.appendChild(filterHost);
    shell.appendChild(drawer);
    shell.appendChild(tableHost);
    root.appendChild(shell);

    function itemId(q) { return q.kind === 'pages' ? q.it.route : q.it.id; }
    function itemKey(q) { return q.kind + ':' + itemId(q); }
    function itemDate(q) {
      if (q.kind === 'pages') return q.it.publish_at || q.it.updated_at || '—';
      if (q.kind === 'jobs') return q.it.published_at || q.it.last_date || q.it.updated_at || '—';
      return q.it.published_at || q.it.updated_at || '—';
    }

    function evaluateReadiness(q) {
      var it = q.it, issues = [];
      var title = (it.title || it.hero_title || '').trim();
      if (!title || title.length < 4) issues.push('Short/Missing Title');
      if (q.kind === 'jobs') {
        if (!((it.summary || it.body_md || '').trim())) issues.push('Missing Summary');
        if (!((it.organisation || '').trim())) issues.push('Missing Org');
        if (it.last_date && Date.parse(it.last_date) < Date.now() - 86400000) issues.push('Past Last Date');
      } else if (q.kind === 'current-affairs') {
        if (!((it.summary || it.body_md || '').trim())) issues.push('Missing Summary');
      } else if (q.kind === 'mock-tests') {
        if (Number(it.question_count || 0) === 0) issues.push('0 Questions');
      } else if (q.kind === 'resources') {
        if (!((it.media_key || '').trim())) issues.push('Missing Media');
        if (!((it.description || '').trim())) issues.push('Missing Summary');
      } else if (q.kind === 'pages') {
        if (!((it.meta_description || it.hero_subtitle || '').trim())) issues.push('Missing Summary');
      }
      if (it.status === 'scheduled') {
        var pub = q.kind === 'pages' ? it.publish_at : it.published_at;
        if (!pub || isNaN(Date.parse(pub))) issues.push('Invalid Schedule');
      }
      return { ok: issues.length === 0, issues: issues };
    }

    function renderKpis() {
      clear(kpiHost);
      var drafts = all.filter(function (q) { return q.it.status === 'draft'; }).length;
      var sched = all.filter(function (q) { return q.it.status === 'scheduled'; }).length;
      var ready = all.filter(function (q) { return evaluateReadiness(q).ok; }).length;
      [
        { l: 'Awaiting Review', v: String(all.length), s: 'Unified D1 & Pages queue' },
        { l: 'Unpublished Drafts', v: String(drafts), s: 'Requires editorial review' },
        { l: 'Scheduled Releases', v: String(sched), s: 'Queued for auto-publish' },
        { l: 'Passes Readiness Checks', v: String(ready) + '/' + String(all.length), s: 'Zero validation blockers' }
      ].forEach(function (k) {
        kpiHost.appendChild(el('div', { class: 'cso-mod-kpi' }, [
          el('div', { class: 'cso-mod-kpi-label', text: k.l }),
          el('div', { class: 'cso-mod-kpi-val', text: k.v }),
          el('div', { class: 'cso-mod-kpi-sub', text: k.s })
        ]));
      });
    }

    async function publishItem(q) {
      if (q.kind === 'pages') {
        await api('PUT', 'pages', Object.assign({}, q.it, { route: q.it.route, status: 'published', publish_at: null, note: 'Approved from Pending Approvals' }));
      } else if (q.kind === 'resources') {
        var fullRes = await api('GET', 'resources/' + encodeURIComponent(q.it.id));
        await api('PUT', 'resources/' + encodeURIComponent(q.it.id), {
          kind: fullRes.kind, title: fullRes.title, exam: fullRes.exam || '',
          year: fullRes.year || null, description: fullRes.description || '',
          media_key: fullRes.media_key, status: 'published'
        });
      } else {
        await api('POST', q.kind + '/' + encodeURIComponent(q.it.id) + '/status', { status: 'published' });
      }
    }

    async function trashItem(q) {
      if (q.kind === 'pages') {
        await api('PUT', 'pages', Object.assign({}, q.it, { route: q.it.route, status: 'trash', publish_at: null, note: 'Rejected from Pending Approvals' }));
      } else {
        await api('DELETE', q.kind + '/' + encodeURIComponent(q.it.id));
      }
    }

    async function archiveItem(q) {
      if (q.kind === 'pages') {
        await api('PUT', 'pages', Object.assign({}, q.it, { route: q.it.route, status: 'archived', publish_at: null, note: 'Bulk archived from Pending Approvals' }));
      } else {
        await api('DELETE', q.kind + '/' + encodeURIComponent(q.it.id));
      }
    }

    async function bulkApprove() {
      var keys = Object.keys(selected);
      if (!keys.length) { toast('Select at least one record', 'amber'); return; }
      var ok = 0, bad = [];
      for (var i = 0; i < keys.length; i++) {
        var q = selected[keys[i]];
        try { await publishItem(q); ok++; } catch (e) { bad.push((q.it.title || q.it.route) + ': ' + e.message); }
      }
      toast(ok + ' published' + (bad.length ? ', ' + bad.length + ' failed — ' + bad[0] : ''), bad.length ? 'amber' : 'success');
      selected = {}; drawer.classList.add('cso-hidden'); load();
    }

    async function bulkArchive() {
      var keys = Object.keys(selected);
      if (!keys.length) { toast('Select at least one record', 'amber'); return; }
      var ok = 0, bad = [];
      for (var i = 0; i < keys.length; i++) {
        var q = selected[keys[i]];
        try { await archiveItem(q); ok++; } catch (e) { bad.push((q.it.title || q.it.route) + ': ' + e.message); }
      }
      toast(ok + ' archived/trashed' + (bad.length ? ', ' + bad.length + ' failed — ' + bad[0] : ''), bad.length ? 'amber' : 'success');
      selected = {}; drawer.classList.add('cso-hidden'); load();
    }

    async function publishNow(q) {
      try {
        await publishItem(q);
        toast('Published live!', 'success');
        drawer.classList.add('cso-hidden');
        load();
      } catch (e) { toast(e.message, 'crimson'); }
    }

    async function rejectNow(q) {
      try {
        await trashItem(q);
        toast('Moved to trash', 'amber');
        drawer.classList.add('cso-hidden');
        load();
      } catch (e) { toast(e.message, 'crimson'); }
    }

    async function openDrawer(q) {
      clear(drawer);
      drawer.classList.remove('cso-hidden');
      var mobileMode = false;
      var full = q.it;
      var qs = [];
      var prHtml = '';

      try {
        if (q.kind === 'mock-tests') {
          var qRes = await api('GET', 'mock-tests/' + encodeURIComponent(q.it.id) + '/questions');
          qs = qRes.items || [];
        } else if (q.kind !== 'pages') {
          full = await api('GET', q.kind + '/' + encodeURIComponent(q.it.id));
          if (full.body_md) {
            var pr = await api('POST', 'preview', { markdown: full.body_md });
            prHtml = pr.html || '';
          }
        }
      } catch (e) {
        toast('Could not load full details: ' + e.message, 'amber');
      }

      var headRight = el('div', { class: 'cso-mod-toolbar' });
      var deskBtn = el('button', { type: 'button', class: 'cso-pill cso-pill-active', text: 'Desktop', onclick: function () { mobileMode = false; syncViewportBtns(); renderPreview(); } });
      var mobBtn = el('button', { type: 'button', class: 'cso-pill', text: 'Mobile 375px', onclick: function () { mobileMode = true; syncViewportBtns(); renderPreview(); } });
      function syncViewportBtns() {
        deskBtn.classList.toggle('cso-pill-active', !mobileMode);
        mobBtn.classList.toggle('cso-pill-active', mobileMode);
      }
      headRight.appendChild(deskBtn);
      headRight.appendChild(mobBtn);
      headRight.appendChild(el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Close', onclick: function () { drawer.classList.add('cso-hidden'); } }));

      drawer.appendChild(el('div', { class: 'cso-drawer-head' }, [
        el('div', {}, [
          el('strong', { text: 'Pre-Publish Review & Editor — ' + (full.title || full.route) }),
          el('div', { class: 'cso-mod-muted', text: NAMES[q.kind] + ' · Status: ' + full.status })
        ]),
        headRight
      ]));

      var left = el('div', { class: 'cso-mod-card' });
      var right = el('div', { class: 'cso-mod-card' });
      drawer.appendChild(el('div', { class: 'cso-mod-grid-2' }, [left, right]));

      var checkWrap = el('div', { class: 'cso-mod-toolbar' });
      var rd = evaluateReadiness({ kind: q.kind, it: full });
      if (rd.ok) {
        checkWrap.appendChild(badge('Readiness: All Checks Passed ✓', 'ok'));
      } else {
        rd.issues.forEach(function (iss) { checkWrap.appendChild(badge('⚠ ' + iss, 'warn')); });
      }
      left.appendChild(checkWrap);

      var titleInp = el('input', { type: 'text', class: 'cso-mod-input', value: full.title || full.hero_title || '' });
      var summaryVal = q.kind === 'pages' ? (full.meta_description || full.hero_subtitle || '') :
                       q.kind === 'resources' ? (full.description || '') :
                       q.kind === 'mock-tests' ? (full.title_or || '') : (full.summary || '');
      var summaryInp = el('textarea', { class: 'cso-mod-textarea', rows: '3', text: summaryVal });
      var orgVal = q.kind === 'jobs' ? (full.organisation || full.category || '') :
                   q.kind === 'mock-tests' ? (full.target_exam || '') :
                   q.kind === 'resources' ? (full.exam || full.kind || '') : (full.category || '');
      var orgInp = el('input', { type: 'text', class: 'cso-mod-input', value: orgVal });
      var dateVal = q.kind === 'jobs' ? (full.last_date || '').slice(0, 10) :
                    q.kind === 'pages' ? (full.publish_at || '').slice(0, 16) :
                    (full.published_at || '').slice(0, 16);
      var dateInp = el('input', { type: q.kind === 'jobs' ? 'date' : 'datetime-local', class: 'cso-mod-input', value: dateVal });
      var noteInp = el('input', { type: 'text', class: 'cso-mod-input', placeholder: 'Optional editorial reviewer note…' });

      left.appendChild(el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Title' }), titleInp]));
      left.appendChild(el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: q.kind === 'mock-tests' ? 'Odia Title / Subtitle' : 'Summary / Description' }), summaryInp]));
      left.appendChild(el('div', { class: 'cso-mod-grid-2' }, [
        el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: q.kind === 'mock-tests' ? 'Target Exam' : 'Organization / Category' }), orgInp]),
        el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: q.kind === 'jobs' ? 'Last Date' : 'Publish / Schedule Date' }), dateInp])
      ]));
      left.appendChild(el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Reviewer Note' }), noteInp]));

      async function saveEdits(targetStatus, schedIso) {
        var st = targetStatus || full.status || 'draft';
        if (q.kind === 'pages') {
          var payload = Object.assign({}, full, {
            route: full.route,
            title: titleInp.value.trim() || full.title,
            meta_description: summaryInp.value.trim(),
            category: orgInp.value.trim() || full.category,
            status: st,
            publish_at: st === 'scheduled' ? (schedIso || full.publish_at) : null,
            note: noteInp.value.trim() || 'Edited in Pending Approvals'
          });
          await api('PUT', 'pages', payload);
        } else if (q.kind === 'resources') {
          await api('PUT', 'resources/' + encodeURIComponent(full.id), {
            kind: full.kind,
            title: titleInp.value.trim() || full.title,
            exam: orgInp.value.trim(),
            year: full.year || null,
            description: summaryInp.value.trim(),
            media_key: full.media_key,
            status: st === 'scheduled' ? 'published' : st
          });
        } else if (q.kind === 'mock-tests') {
          await api('PUT', 'mock-tests/' + encodeURIComponent(full.id), {
            slug: full.slug,
            title: titleInp.value.trim() || full.title,
            title_or: summaryInp.value.trim(),
            target_exam: orgInp.value.trim() || full.target_exam,
            duration_minutes: full.duration_minutes,
            total_marks: full.total_marks,
            negative_marking: full.negative_marking,
            status: st,
            published_at: st === 'scheduled' ? (schedIso || full.published_at) : full.published_at
          });
        } else {
          var postPayload = Object.assign({}, full, {
            title: titleInp.value.trim() || full.title,
            summary: summaryInp.value.trim(),
            status: st
          });
          if (q.kind === 'jobs') {
            postPayload.organisation = orgInp.value.trim();
            if (dateInp.value) postPayload.last_date = dateInp.value;
          } else {
            postPayload.category = orgInp.value.trim() || full.category;
          }
          if (st === 'scheduled' && schedIso) postPayload.published_at = schedIso;
          await api('PUT', q.kind + '/' + encodeURIComponent(full.id), postPayload);
        }
      }

      var actionBar = el('div', { class: 'cso-mod-toolbar' }, [
        el('button', { type: 'button', class: 'cso-mod-btn', text: 'Save Edits (Keep Unpublished)', onclick: async function () {
          try { await saveEdits(full.status === 'scheduled' ? 'scheduled' : 'draft', full.published_at || full.publish_at); toast('Draft saved (still unpublished)', 'success'); load(); } catch (e) { toast(e.message, 'crimson'); }
        } }),
        el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-primary', text: 'Approve & Publish Live', onclick: async function () {
          try { await saveEdits('published', null); toast('Saved & published live!', 'success'); drawer.classList.add('cso-hidden'); load(); } catch (e) { toast(e.message, 'crimson'); }
        } }),
        el('button', { type: 'button', class: 'cso-mod-btn', text: 'Reject / Trash', onclick: function () { rejectNow(q); } })
      ]);
      if (q.kind !== 'resources') {
        var schedInp = el('input', { type: 'datetime-local', class: 'cso-mod-input', value: (dateInp.value && dateInp.value.length > 10) ? dateInp.value : '' });
        actionBar.appendChild(schedInp);
        actionBar.appendChild(el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Reschedule', onclick: async function () {
          if (!schedInp.value) { toast('Pick a future date/time', 'amber'); return; }
          try { await saveEdits('scheduled', new Date(schedInp.value).toISOString()); toast('Rescheduled', 'success'); drawer.classList.add('cso-hidden'); load(); } catch (e) { toast(e.message, 'crimson'); }
        } }));
      }
      left.appendChild(actionBar);

      function renderPreview() {
        clear(right);
        var frameCard = el('div', { class: mobileMode ? 'cso-preview-card-mobile' : 'cso-preview-card-desktop' });
        var curTitle = titleInp.value.trim() || '(Untitled)';
        var curSummary = summaryInp.value.trim() || 'No summary provided yet.';
        var curOrg = orgInp.value.trim() || NAMES[q.kind];
        var curDate = dateInp.value || 'TBD';

        frameCard.appendChild(el('div', { class: 'cso-preview-kicker', text: NAMES[q.kind].toUpperCase() + ' · ' + curOrg + ' · PREVIEW (UNPUBLISHED)' }));
        frameCard.appendChild(el('h4', { text: curTitle }));
        frameCard.appendChild(el('div', { class: 'cso-preview-dates', text: (q.kind === 'jobs' ? 'Last Date: ' : 'Target Date: ') + curDate }));
        frameCard.appendChild(el('p', { class: 'cso-preview-body', text: curSummary }));

        if (q.kind === 'pages' && full.route) {
          var wrap = el('div', { class: 'cso-preview-frame-wrap' });
          wrap.appendChild(el('iframe', {
            class: mobileMode ? 'cso-preview-frame-mobile' : 'cso-preview-frame',
            src: full.route,
            title: 'Live Page Preview ' + full.route
          }));
          frameCard.appendChild(wrap);
        } else if (q.kind === 'mock-tests') {
          frameCard.appendChild(el('p', { class: 'cso-mod-muted', text: (full.duration_minutes || 0) + ' min · ' + (full.total_marks || 0) + ' marks · ' + qs.length + ' questions' }));
          if (!qs.length) frameCard.appendChild(badge('0 Questions — add questions before publishing', 'err'));
          qs.slice(0, 5).forEach(function (x, i) {
            frameCard.appendChild(el('p', {}, [el('strong', { text: (i + 1) + '. ' + x.question_en })]));
          });
        } else if (prHtml) {
          var bodyBox = el('div', { class: 'cso-preview-body' });
          renderSanitizedHtml(bodyBox, prHtml);
          frameCard.appendChild(bodyBox);
        }
        right.appendChild(frameCard);
      }

      [titleInp, summaryInp, orgInp, dateInp].forEach(function (inp) {
        inp.addEventListener('input', renderPreview);
      });
      renderPreview();
    }

    function draw() {
      renderKpis();
      var shown = all.filter(function (q) { return (typeF === 'All' || NAMES[q.kind] === typeF) && (statF === 'All' || q.it.status === statF); });
      clear(tableHost);

      if (!shown.length) {
        var emptyCard = el('div', { class: 'cso-mod-card' }, [
          el('h4', { text: all.length ? 'No matching items in this filter' : 'Editorial Queue Clear — Zero Pending Drafts' }),
          el('p', { class: 'cso-mod-muted', text: all.length ? 'Adjust the type or status filter pills above to inspect queued items.' : 'All Jobs, Current Affairs, Mock Tests, Resources, and Website Pages are published or clear. Create a new draft below to review and preview before publishing.' })
        ]);
        var quickRow = el('div', { class: 'cso-mod-toolbar' });
        if (all.length) {
          quickRow.appendChild(el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-primary', text: 'Reset Filters', onclick: function () { typeF = 'All'; statF = 'All'; draw(); } }));
        }
        quickRow.appendChild(el('button', { type: 'button', class: 'cso-mod-btn', text: '+ Create Job Draft', onclick: function () { goTo(['folder-05', 'module-05-008']); } }));
        quickRow.appendChild(el('button', { type: 'button', class: 'cso-mod-btn', text: '+ Create Current Affair Draft', onclick: function () { goTo(['folder-04', 'module-04-004']); } }));
        quickRow.appendChild(el('button', { type: 'button', class: 'cso-mod-btn', text: '+ Create Mock Test Draft', onclick: function () { goTo(['folder-05', 'module-05-014']); } }));
        quickRow.appendChild(el('button', { type: 'button', class: 'cso-mod-btn', text: '+ Create Page Draft', onclick: function () { goTo(['folder-02', 'module-02-002']); } }));
        emptyCard.appendChild(quickRow);
        tableHost.appendChild(emptyCard);
        return;
      }

      var rows = shown.map(function (q) {
        var key = itemKey(q);
        var rd = evaluateReadiness(q);
        var rdCell = el('td', {});
        if (rd.ok) {
          rdCell.appendChild(badge('Ready ✓', 'ok'));
        } else {
          rd.issues.slice(0, 2).forEach(function (iss) { rdCell.appendChild(badge(iss, 'warn')); });
          if (rd.issues.length > 2) rdCell.appendChild(badge('+' + (rd.issues.length - 2), 'info'));
        }
        var actCell = el('td', {}, [
          el('div', { class: 'cso-mod-toolbar' }, [
            el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm cso-mod-btn-primary', text: 'Preview & Review', onclick: function () { openDrawer(q); } }),
            el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Approve & Publish Live', onclick: function () { publishNow(q); } }),
            el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Reschedule', onclick: function () { openDrawer(q); } }),
            el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Reject / Trash', onclick: function () { rejectNow(q); } })
          ])
        ]);
        return el('tr', {}, [
          el('td', {}, el('input', { type: 'checkbox', checked: selected[key] ? true : false, onchange: function (e) { if (e.target.checked) selected[key] = q; else delete selected[key]; } })),
          el('td', {}, badge(NAMES[q.kind], 'info')),
          el('td', { text: q.it.title || q.it.route }),
          el('td', {}, badge(q.it.status, q.it.status === 'scheduled' ? 'warn' : 'info')),
          rdCell,
          el('td', { text: String(itemDate(q)).slice(0, 16) }),
          actCell
        ]);
      });
      tableHost.appendChild(el('p', { class: 'cso-mod-muted', text: shown.length + ' records awaiting review' }));
      tableHost.appendChild(safeTable(['Select', 'Type', 'Title', 'Status', 'Readiness', 'Date', 'Actions'], rows));
    }

    async function load() {
      loading(tableHost, 'Loading unified review queue…');
      try {
        var r = await Promise.all([
          api('GET', 'jobs?limit=100'),
          api('GET', 'current-affairs?limit=100'),
          api('GET', 'mock-tests?limit=100'),
          api('GET', 'resources'),
          api('GET', 'pages')
        ]);
        all = [];
        [['jobs', r[0]], ['current-affairs', r[1]], ['mock-tests', r[2]], ['resources', r[3]], ['pages', r[4]]].forEach(function (p) {
          (p[1].items || []).forEach(function (it) {
            if (it.status === 'draft' || it.status === 'scheduled') all.push({ kind: p[0], it: it });
          });
        });
        draw();
      } catch (e) { fail(tableHost, e); }
    }
    load();
  }

  function renderAnalyticsStudio(root, actions) {
    addHeaderPill(actions, '● D1 Content, CBT & SEO Analytics');
    var shell = el('div', { class: 'cso-mod-shell' });
    var drawer = el('div', { class: 'cso-drawer cso-hidden' });
    var host = el('div', { class: 'cso-mod-shell' });
    var data = null;
    var catSel = el('select', { class: 'cso-mod-select' });
    var statSel = el('select', { class: 'cso-mod-select' });
    var searchInp = el('input', { type: 'text', class: 'cso-mod-input', placeholder: 'Search route, title, exam or category…' });
    ['All statuses', 'published', 'draft', 'scheduled', 'expired', 'archived'].forEach(function (s) {
      statSel.appendChild(el('option', { value: s, text: s }));
    });
    renderBanner(shell, 'Website Analytics Studio', 'Live D1 pipeline, CBT performance, and interactive SEO remediation with SERP & route previews.', [
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'Refresh', onclick: loadAnalytics }),
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'Export JSON', onclick: function () { if (data) downloadFile('cso-analytics-' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify(report(), null, 2)); } }),
      el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-primary', text: 'Export CSV', onclick: exportCsv })
    ]);
    shell.appendChild(el('div', { class: 'cso-mod-grid-3' }, [
      el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Category / Exam' }), catSel]),
      el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Status' }), statSel]),
      el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Quick Search' }), searchInp])
    ]));
    shell.appendChild(drawer);
    shell.appendChild(host);
    root.appendChild(shell);
    catSel.addEventListener('change', draw);
    statSel.addEventListener('change', draw);
    searchInp.addEventListener('input', draw);

    function items() {
      var out = [];
      data.jobs.forEach(function (x) { out.push({ t: 'Job', title: x.title || '', cat: x.category || 'Uncategorized', status: x.status }); });
      data.cas.forEach(function (x) { out.push({ t: 'Current Affairs', title: x.title || '', cat: x.category || 'Uncategorized', status: x.status }); });
      data.tests.forEach(function (x) { out.push({ t: 'Mock Test', title: x.title || '', cat: x.target_exam || 'Uncategorized', status: x.status }); });
      return out;
    }
    function filtered() {
      var q = searchInp.value.toLowerCase().trim();
      return items().filter(function (i) {
        return (catSel.value === 'All categories' || i.cat === catSel.value) &&
          (statSel.value === 'All statuses' || i.status === statSel.value) &&
          (!q || (i.title + ' ' + i.cat + ' ' + i.t).toLowerCase().indexOf(q) >= 0);
      });
    }
    function suggestOdishaSeo(p) {
      var label = (p.hero_title || p.title || p.route.replace(/\//g, ' ').trim() || 'Odisha Govt Exams').replace(/\s+/g, ' ').trim();
      var titleBase = label.length > 36 ? label.slice(0, 36).trim() : label;
      var title = titleBase + ' | CS Odisha Portal';
      if (title.length < 50) title = titleBase + ' — OPSC, OSSC & OSSSC | CS Odisha';
      if (title.length > 60) title = title.slice(0, 57).trim() + '…';
      var desc = 'Explore ' + label + ' on Common Sense Odisha (csodisha.com): latest OPSC, OSSC, OSSSC updates, syllabus, free CBT mock tests, and official notifications.';
      if (desc.length < 145) desc += ' Updated daily for Odisha aspirants.';
      if (desc.length > 160) desc = desc.slice(0, 157).trim() + '…';
      return { title: title, description: desc };
    }
    function seoRows() {
      var q = searchInp.value.toLowerCase().trim();
      return data.pages.filter(function (p) {
        var catOk = catSel.value === 'All categories' || (p.category || '') === catSel.value;
        var stOk = statSel.value === 'All statuses' || (p.status || 'published') === statSel.value;
        var qOk = !q || ((p.route || '') + ' ' + (p.title || '') + ' ' + (p.category || '')).toLowerCase().indexOf(q) >= 0;
        return catOk && stOk && qOk;
      }).map(function (p) {
        var desc = p.meta_description != null ? p.meta_description : (p.description || '');
        var tl = (p.title || '').trim().length, dl = desc.trim().length, issues = [];
        if (tl < 20 || tl > 70) issues.push('title ' + tl + ' chars');
        if (dl < 70 || dl > 170) issues.push('description ' + dl + ' chars');
        return { page: p, route: p.route, category: p.category, titleLen: tl, descLen: dl, issues: issues };
      });
    }
    function cbtRows() {
      var q = searchInp.value.toLowerCase().trim();
      return data.board.map(function (b) {
        var it = b.items;
        var acc = it.length ? it.reduce(function (s, x) { return s + (Number(x.accuracy) || 0); }, 0) / it.length : 0;
        return { title: b.test.title, cat: b.test.target_exam || 'Uncategorized', status: b.test.status, participants: it.length, avgAcc: Math.round(acc * 10) / 10, top: it[0] ? it[0].score + '/' + (it[0].maxScore || it[0].max_score) : '—' };
      }).filter(function (r) {
        return r.participants && (catSel.value === 'All categories' || r.cat === catSel.value) && (statSel.value === 'All statuses' || r.status === statSel.value) && (!q || r.title.toLowerCase().indexOf(q) >= 0);
      }).sort(function (a, b) { return b.avgAcc - a.avgAcc; });
    }
    function report() { return { generated_at: new Date().toISOString(), stats: data.stats, pipeline: tally(function (i) { return i.status; }), coverage: tally(function (i) { return i.cat; }), cbt: cbtRows(), seo: seoRows().map(function (r) { return { route: r.route, category: r.category, issues: r.issues }; }) }; }
    function tally(keyFn) { var c = {}; filtered().forEach(function (i) { var k = keyFn(i); c[k] = (c[k] || 0) + 1; }); return c; }
    function exportCsv() {
      if (!data) return;
      var rep = report(), lines = ['section,label,value'];
      Object.keys(rep.pipeline).forEach(function (k) { lines.push(['pipeline', k, rep.pipeline[k]].map(csvCell).join(',')); });
      Object.keys(rep.coverage).forEach(function (k) { lines.push(['coverage', k, rep.coverage[k]].map(csvCell).join(',')); });
      rep.cbt.forEach(function (r) { lines.push(['cbt', r.title, r.avgAcc + '% avg accuracy / ' + r.participants + ' participants'].map(csvCell).join(',')); });
      rep.seo.forEach(function (r) { lines.push(['seo', r.route, r.issues.length ? r.issues.join('; ') : 'ready'].map(csvCell).join(',')); });
      downloadFile('cso-analytics.csv', lines.join('\n'), 'text/csv'); toast('CSV exported', 'success');
    }
    function chartCard(title, node) { return el('div', { class: 'cso-mod-card' }, [el('h3', { text: title }), node]); }
    function emptyChartCard(title, msg) {
      return el('div', { class: 'cso-mod-card' }, [
        el('h3', { text: title }),
        el('p', { class: 'cso-mod-muted', text: msg }),
        el('div', { class: 'cso-mod-toolbar' }, [
          el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: '+ Create Job', onclick: function () { goTo(['folder-05', 'module-05-008']); } }),
          el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: '+ Create Current Affair', onclick: function () { goTo(['folder-04', 'module-04-004']); } }),
          el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: '+ Create Mock Test', onclick: function () { goTo(['folder-05', 'module-05-014']); } }),
          el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm cso-mod-btn-primary', text: 'Seed Odisha Starter Content', onclick: async function () {
            try { await api('POST', 'seed-odisha', {}); toast('Odisha starter content seeded!', 'success'); loadAnalytics(); } catch (e) { toast(e.message, 'crimson'); }
          } })
        ])
      ]);
    }

    function openSeoDrawer(row) {
      clear(drawer);
      drawer.classList.remove('cso-hidden');
      var p = row.page;
      var mobileMode = false;
      var deskBtn = el('button', { type: 'button', class: 'cso-pill cso-pill-active', text: 'Desktop', onclick: function () { mobileMode = false; syncViewport(); renderPreview(); } });
      var mobBtn = el('button', { type: 'button', class: 'cso-pill', text: 'Mobile 375px', onclick: function () { mobileMode = true; syncViewport(); renderPreview(); } });
      function syncViewport() {
        deskBtn.classList.toggle('cso-pill-active', !mobileMode);
        mobBtn.classList.toggle('cso-pill-active', mobileMode);
      }
      drawer.appendChild(el('div', { class: 'cso-drawer-head' }, [
        el('div', {}, [
          el('strong', { text: 'SEO Remediation & Pre-Publish Preview — ' + p.route }),
          el('div', { class: 'cso-mod-muted', text: 'Category: ' + (p.category || 'General') + ' · Current Status: ' + (p.status || 'published') })
        ]),
        el('div', { class: 'cso-mod-toolbar' }, [
          deskBtn, mobBtn,
          el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Close', onclick: function () { drawer.classList.add('cso-hidden'); } })
        ])
      ]));

      var left = el('div', { class: 'cso-mod-card' });
      var right = el('div', { class: 'cso-mod-card' });
      drawer.appendChild(el('div', { class: 'cso-mod-grid-2' }, [left, right]));

      var titleInp = el('input', { type: 'text', class: 'cso-mod-input', value: p.title || '' });
      var descInp = el('textarea', { class: 'cso-mod-textarea', rows: '3', text: p.meta_description != null ? p.meta_description : (p.description || '') });
      var heroInp = el('input', { type: 'text', class: 'cso-mod-input', value: p.hero_title || '' });
      var titleMeter = el('div', { class: 'cso-mod-toolbar' });
      var descMeter = el('div', { class: 'cso-mod-toolbar' });

      function updateMeters() {
        var tl = titleInp.value.trim().length, dl = descInp.value.trim().length;
        clear(titleMeter);
        titleMeter.appendChild(el('span', { class: 'cso-mod-muted', text: tl + ' chars (optimal 50–60)' }));
        titleMeter.appendChild(badge(tl >= 50 && tl <= 60 ? 'Optimal ✓' : tl >= 20 && tl <= 70 ? 'Acceptable' : tl < 20 ? 'Too short' : 'Too long', tl >= 50 && tl <= 60 ? 'ok' : 'warn'));
        clear(descMeter);
        descMeter.appendChild(el('span', { class: 'cso-mod-muted', text: dl + ' chars (optimal 145–160)' }));
        descMeter.appendChild(badge(dl >= 145 && dl <= 160 ? 'Optimal ✓' : dl >= 70 && dl <= 170 ? 'Acceptable' : dl < 70 ? 'Too short' : 'Too long', dl >= 145 && dl <= 160 ? 'ok' : 'warn'));
      }

      left.appendChild(el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'SEO Title' }), titleInp, titleMeter]));
      left.appendChild(el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Meta Description' }), descInp, descMeter]));
      left.appendChild(el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Hero Headline (optional override)' }), heroInp]));

      async function savePageSeo(status) {
        try {
          await api('PUT', 'pages', Object.assign({}, p, {
            route: p.route,
            title: titleInp.value.trim(),
            meta_description: descInp.value.trim(),
            hero_title: heroInp.value.trim(),
            status: status,
            publish_at: null,
            note: 'SEO remediation from Website Analytics'
          }));
          toast(status === 'published' ? 'SEO published live!' : 'SEO draft saved', 'success');
          drawer.classList.add('cso-hidden');
          loadAnalytics();
        } catch (e) { toast(e.message, 'crimson'); }
      }

      left.appendChild(el('div', { class: 'cso-mod-toolbar' }, [
        el('button', { type: 'button', class: 'cso-mod-btn', text: 'Generate Odisha SEO Suggestion', onclick: function () {
          var sug = suggestOdishaSeo(p);
          titleInp.value = sug.title;
          descInp.value = sug.description;
          updateMeters();
          renderPreview();
        } }),
        el('button', { type: 'button', class: 'cso-mod-btn', text: 'Save Draft', onclick: function () { savePageSeo('draft'); } }),
        el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-primary', text: 'Publish Live Now', onclick: function () { savePageSeo('published'); } })
      ]));

      function renderPreview() {
        updateMeters();
        clear(right);
        var curT = titleInp.value.trim() || '(Missing Title)';
        var curD = descInp.value.trim() || 'No meta description set — search engines will auto-snippet page text.';
        right.appendChild(el('div', { class: 'cso-mod-label', text: 'Google SERP Result Preview' }));
        right.appendChild(el('div', { class: 'cso-serp-card' }, [
          el('div', { class: 'cso-serp-url', text: 'https://csodisha.com' + p.route }),
          el('div', { class: 'cso-serp-title', text: curT }),
          el('p', { class: 'cso-serp-desc', text: curD })
        ]));
        right.appendChild(el('div', { class: 'cso-mod-label', text: 'Social Share Card Preview' }));
        right.appendChild(el('div', { class: 'cso-og-card' }, [
          el('div', { class: 'cso-preview-kicker', text: 'CSODISHA.COM · ' + String(p.category || 'PORTAL').toUpperCase() }),
          el('strong', { text: curT }),
          el('p', { class: 'cso-mod-muted', text: curD })
        ]));
        right.appendChild(el('div', { class: 'cso-mod-label', text: 'Embedded Live Route Preview (' + (mobileMode ? 'Mobile 375px' : 'Desktop') + ')' }));
        right.appendChild(el('div', { class: 'cso-preview-frame-wrap' }, [
          el('iframe', { class: mobileMode ? 'cso-preview-frame-mobile' : 'cso-preview-frame', src: p.route, title: 'Live preview ' + p.route })
        ]));
      }

      [titleInp, descInp, heroInp].forEach(function (inp) { inp.addEventListener('input', renderPreview); });
      renderPreview();
    }

    function openBulkSeoDrawer(seoList) {
      clear(drawer);
      drawer.classList.remove('cso-hidden');
      var targets = seoList.filter(function (r) { return r.descLen === 0 || r.descLen < 20; }).map(function (r) {
        return { page: r.page, route: r.route, sug: suggestOdishaSeo(r.page) };
      });
      drawer.appendChild(el('div', { class: 'cso-drawer-head' }, [
        el('strong', { text: 'Preview Bulk SEO Fixes (' + targets.length + ' pages with 0/short descriptions)' }),
        el('div', { class: 'cso-mod-toolbar' }, [
          targets.length ? el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-primary', text: 'Apply & Publish All (' + targets.length + ')', onclick: async function () {
            var ok = 0;
            for (var i = 0; i < targets.length; i++) {
              var t = targets[i];
              try {
                await api('PUT', 'pages', Object.assign({}, t.page, {
                  route: t.route, title: t.sug.title, meta_description: t.sug.description, status: 'published', publish_at: null, note: 'Bulk SEO remediation'
                }));
                ok++;
              } catch (_) {}
            }
            toast('Published ' + ok + ' SEO page fixes!', 'success');
            drawer.classList.add('cso-hidden');
            loadAnalytics();
          } }) : el('span', { class: 'cso-mod-muted', text: 'All pages have descriptions' }),
          el('button', { type: 'button', class: 'cso-mod-btn', text: 'Close', onclick: function () { drawer.classList.add('cso-hidden'); } })
        ])
      ]));
      if (!targets.length) {
        drawer.appendChild(el('p', { class: 'cso-mod-muted', text: 'Zero pages have 0-char descriptions under the current filter.' }));
        return;
      }
      drawer.appendChild(safeTable(['Route', 'Suggested Title', 'Suggested Description'], targets.slice(0, 30).map(function (t) {
        return el('tr', {}, [
          el('td', { text: t.route }),
          el('td', { text: t.sug.title }),
          el('td', { text: t.sug.description })
        ]);
      })));
    }

    function draw() {
      clear(host);
      var s = data.stats;
      var filt = filtered();
      var cbt = cbtRows(), seo = seoRows();
      var ready = seo.filter(function (r) { return !r.issues.length; }).length;
      var seoPct = seo.length ? Math.round((ready / seo.length) * 100) : 100;

      var kpiStrip = el('div', { class: 'cso-mod-kpis' });
      [
        { l: 'CBT Attempts', v: String(s.attempts_total || 0), sub: data.tests.filter(function (t) { return t.status === 'published'; }).length + ' live mock tests' },
        { l: 'Bookmarks', v: String(s.bookmarks_total || 0), sub: 'Saved across candidate accounts' },
        { l: 'Registered Users', v: String(s.accounts ? s.accounts.total : 0), sub: filt.length + ' filtered D1 items' },
        { l: 'Audit Events 24h', v: String(s.audit_24h || 0), sub: (s.jobs ? s.jobs.live : 0) + ' live jobs · ' + (s.current_affairs ? s.current_affairs.live : 0) + ' CA' },
        { l: 'SEO Readiness Score', v: seoPct + '%', sub: ready + ' / ' + seo.length + ' pages optimal' }
      ].forEach(function (k) {
        kpiStrip.appendChild(el('div', { class: 'cso-mod-kpi' }, [
          el('div', { class: 'cso-mod-kpi-label', text: k.l }),
          el('div', { class: 'cso-mod-kpi-val', text: k.v }),
          el('div', { class: 'cso-mod-kpi-sub', text: k.sub })
        ]));
      });
      host.appendChild(kpiStrip);

      var pipe = tally(function (i) { return i.status; });
      var pipeKeys = Object.keys(pipe);
      var covMap = tally(function (i) { return i.cat; });
      var covKeys = Object.keys(covMap).sort(function (a, b) { return covMap[b] - covMap[a]; }).slice(0, 12);

      host.appendChild(el('div', { class: 'cso-mod-grid-2' }, [
        pipeKeys.length
          ? chartCard('Content Status Pipeline', barChart(pipeKeys.map(function (k) { return { label: k, value: pipe[k], cls: k === 'published' ? 'cso-bar-ok' : k === 'draft' ? 'cso-bar-warn' : 'cso-bar-info' }; }), 'Content status pipeline'))
          : emptyChartCard('Content Status Pipeline', '0 D1 content records match the current filter (' + data.pages.length + ' static/override routes remain live).'),
        covKeys.length
          ? chartCard('Exam Category Coverage', barChart(covKeys.map(function (k) { return { label: k, value: covMap[k] }; }), 'Exam category coverage'))
          : emptyChartCard('Exam Category Coverage', 'No D1 items categorized under this filter yet. Create content or seed Odisha starter data.')
      ]));

      host.appendChild(el('div', { class: 'cso-mod-grid-2' }, [
        cbt.length
          ? chartCard('CBT Attempts & Average Accuracy (top-10 best attempts per test)', barChart(cbt.slice(0, 10).map(function (r) { return { label: r.title, value: r.avgAcc, text: r.avgAcc + '% · ' + r.participants + ' users', cls: 'cso-bar-info' }; }), 'CBT breakdown'))
          : emptyChartCard('CBT Attempts & Average Accuracy', '0 CBT attempts recorded for matching tests yet. Publish a mock test or seed starter data.'),
        chartCard('Site Page SEO Readiness (' + seo.length + ' pages)', barChart([{ label: 'Ready', value: ready, cls: 'cso-bar-ok' }, { label: 'Needs title/description fix', value: seo.length - ready, cls: 'cso-bar-warn' }], 'SEO readiness'))
      ]));

      host.appendChild(chartCard('Top-Performing Mock Tests Leaderboard', safeTable(['Rank', 'Mock Test', 'Participants', 'Avg accuracy', 'Top score'], cbt.map(function (r, i) {
        return el('tr', {}, [el('td', { text: String(i + 1) }), el('td', { text: r.title }), el('td', { text: String(r.participants) }), el('td', { text: r.avgAcc + '%' }), el('td', { text: r.top })]);
      }))));

      var seoWithIssues = seo.filter(function (r) { return r.issues.length; });
      var seoCard = el('div', { class: 'cso-mod-card' }, [
        el('div', { class: 'cso-drawer-head' }, [
          el('h3', { text: 'SEO Issues (' + seoWithIssues.length + ' routes needing attention)' }),
          el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm cso-mod-btn-primary', text: 'Preview Bulk SEO Fixes', onclick: function () { openBulkSeoDrawer(seoWithIssues); } })
        ]),
        safeTable(['Route', 'Category', 'Issues', 'Actions'], seoWithIssues.slice(0, 30).map(function (r) {
          return el('tr', {}, [
            el('td', { text: r.route }),
            el('td', { text: r.category || '—' }),
            el('td', {}, badge(r.issues.join(', '), 'warn')),
            el('td', {}, el('div', { class: 'cso-mod-toolbar' }, [
              el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm cso-mod-btn-primary', text: 'Fix & Preview', onclick: function () { openSeoDrawer(r); } }),
              el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Preview Route', onclick: function () { openSeoDrawer(r); } })
            ]))
          ]);
        }))
      ]);
      host.appendChild(seoCard);
    }

    async function loadAnalytics() {
      loading(host, 'Loading analytics…');
      try {
        var r = await Promise.all([api('GET', 'stats'), api('GET', 'jobs?limit=100'), api('GET', 'current-affairs?limit=100'), api('GET', 'mock-tests?limit=100'), api('GET', 'pages')]);
        var tests = r[3].items || [];
        var pub = tests.filter(function (t) { return t.status === 'published'; }).slice(0, 20);
        var board = await Promise.all(pub.map(async function (t) { try { var lb = await (await fetch('/api/content/mock-tests/' + encodeURIComponent(t.slug || t.id) + '/leaderboard', { credentials: 'same-origin' })).json(); return { test: t, items: lb.items || [] }; } catch (_) { return { test: t, items: [] }; } }));
        data = { stats: r[0], jobs: r[1].items || [], cas: r[2].items || [], tests: tests, pages: r[4].items || [], board: board };
        var prevCat = catSel.value || 'All categories';
        clear(catSel);
        var cats = {};
        items().forEach(function (i) { cats[i.cat] = 1; });
        data.pages.forEach(function (p) { if (p.category) cats[p.category] = 1; });
        catSel.appendChild(el('option', { value: 'All categories', text: 'All categories' }));
        Object.keys(cats).sort().forEach(function (c) { catSel.appendChild(el('option', { value: c, text: c })); });
        if (cats[prevCat]) catSel.value = prevCat;
        draw();
      } catch (e) { fail(host, e); }
    }
    loadAnalytics();
  }

  var DIR_EP = { 'folder-01': ['/api/admin/stats', '/api/admin/audit', '/api/admin/banner', '/api/admin/maintenance'], 'folder-02': ['/api/admin/preview', '/admin/site-manifest.json'], 'folder-03': ['/api/admin/preview', '/admin/site-manifest.json'], 'folder-04': ['/api/admin/current-affairs', '/api/admin/jobs'], 'folder-05': ['/api/admin/mock-tests', '/api/admin/resources', '/api/admin/jobs'], 'folder-06': ['/admin/site-manifest.json'], 'folder-07': ['/api/admin/media', '/api/admin/media/upload'], 'folder-09': ['/api/admin/users'], 'folder-10': ['/api/admin/stats', '/api/admin/audit'], 'folder-13': ['/sitemap.xml', '/feed.xml', '/robots.txt'], 'folder-14': ['/api/admin/current-affairs', '/api/admin/jobs'], 'folder-15': ['/api/health', '/sitemap.xml'], 'folder-16': ['/api/admin/audit', '/api/admin/incidents'], 'folder-17': ['/api/admin/maintenance', '/api/admin/stats'], 'folder-19': ['/admin/data/master-navigation.json'] };
  function dirCaps(folderId, eps) {
    var caps = [];
    if (eps.some(function (e) { return e.indexOf('/api/admin/') === 0; })) caps.push('Live D1');
    if (eps.some(function (e) { return /media|resources/.test(e); })) caps.push('R2 Storage');
    if (/folder-0[2-3]|folder-04/.test(folder_re(folderId)) || eps.indexOf('/api/admin/preview') >= 0) caps.push('Preview Studio');
    if (/folder-10|folder-01|folder-13/.test(folder_re(folderId))) caps.push('SVG Analytics');
    if (eps.some(function (e) { return /manifest|sitemap|feed|robots|navigation/.test(e); })) caps.push('Manifest');
    return caps;
  }
  function folder_re(id) { return id + ' '; }

  var FOLDER_TABLES = {
    'folder-01': ['site_settings', 'audit_log', 'site_pages'],
    'folder-02': ['site_pages', 'site_page_revisions'],
    'folder-03': ['site_pages', 'site_settings'],
    'folder-04': ['posts', 'media_assets', 'audit_log'],
    'folder-05': ['mock_tests', 'questions', 'attempts', 'resources', 'posts'],
    'folder-06': ['site_pages', 'posts', 'mock_tests'],
    'folder-07': ['media_assets (R2 cso-media)'],
    'folder-09': ['users', 'sessions', 'audit_log'],
    'folder-10': ['attempts', 'bookmarks', 'site_pages', 'audit_log'],
    'folder-13': ['posts', 'mock_tests', 'site_pages'],
    'folder-14': ['posts', 'audit_log'],
    'folder-15': ['site_settings', 'audit_log'],
    'folder-16': ['incidents', 'audit_log'],
    'folder-17': ['site_settings', 'posts', 'audit_log']
  };
  var FOLDER_PUBLIC_ROUTE = {
    'folder-01': '/', 'folder-02': '/', 'folder-03': '/about/', 'folder-04': '/current-affairs/',
    'folder-05': '/mock-tests/', 'folder-06': '/jobs-careers/', 'folder-13': '/sitemap.xml', 'folder-14': '/current-affairs/'
  };

  function renderCommandDirectory(root, actions) {
    addHeaderPill(actions, '● Command Directory & Capability Matrix');
    var shell = el('div', { class: 'cso-mod-shell' });
    var kpiHost = el('div', { class: 'cso-mod-kpis' });
    var suiteWrap = el('div', { class: 'cso-mod-card' });
    var drawer = el('div', { class: 'cso-drawer cso-hidden' });
    var tableHost = el('div', {});
    var search = el('input', { type: 'text', class: 'cso-mod-input', placeholder: 'Search module id, title or endpoint…' });
    var folderSel = el('select', { class: 'cso-mod-select' }, [el('option', { value: '', text: 'All suites / folders' })]);
    var pageSizeSel = el('select', { class: 'cso-mod-select' }, [
      el('option', { value: '25', text: '25 per page' }),
      el('option', { value: '50', text: '50 per page' }),
      el('option', { value: 'all', text: 'All modules' })
    ]);
    var rows = [], folders = [], filterMode = 'All', pageIdx = 0, suiteOpen = true;
    var modConfig = {}, draftConfig = {};

    renderBanner(shell, 'Master Feature Registry', '241-module command directory with suite coverage, pagination, live D1/route previews & persistent feature flags.', [
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'Export JSON', onclick: function () { downloadFile('cso-registry-' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify(rows, null, 2)); } }),
      el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-primary', text: 'Export CSV', onclick: exportRegistryCsv })
    ]);
    shell.appendChild(kpiHost);
    shell.appendChild(suiteWrap);
    shell.appendChild(pills(['All', 'Dedicated Studios', 'D1 + Edge Wired', 'Pinned', 'Disabled'], function (m) { filterMode = m; pageIdx = 0; draw(); }));
    shell.appendChild(el('div', { class: 'cso-mod-grid-3' }, [
      el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Search Registry' }), search]),
      el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Suite / Folder' }), folderSel]),
      el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Page Size' }), pageSizeSel])
    ]));
    shell.appendChild(drawer);
    shell.appendChild(tableHost);
    root.appendChild(shell);

    function effectiveCfg(id) {
      return Object.assign({ enabled: true, pinned: false, minRole: 'editor', note: '' }, modConfig[id] || {}, draftConfig[id] || {});
    }
    function isDedicated(r) {
      return r.folderId === 'folder-01' || r.folderId === 'folder-02' || r.folderId === 'folder-03' || r.eps[0] !== '(client-side studio)';
    }
    function exportRegistryCsv() {
      var lines = ['id,title,folder,enabled,pinned,min_role,endpoints'];
      rows.forEach(function (r) {
        var c = effectiveCfg(r.id);
        lines.push([r.id, r.title, r.folderTitle, c.enabled, c.pinned, c.minRole, r.eps.join(' | ')].map(csvCell).join(','));
      });
      downloadFile('cso-registry.csv', lines.join('\n'), 'text/csv');
      toast('Registry CSV exported', 'success');
    }

    function renderKpis() {
      clear(kpiHost);
      var wired = rows.filter(function (r) { return r.eps[0] !== '(client-side studio)'; }).length;
      var dedicated = rows.filter(isDedicated).length;
      var enabledCnt = rows.filter(function (r) { return effectiveCfg(r.id).enabled; }).length;
      [
        { l: 'Total Registered Modules', v: String(rows.length), s: folders.length + ' sidebar suites' },
        { l: 'D1 + Edge Live Coverage', v: '100%', s: wired + ' API-wired · ' + (rows.length - wired) + ' edge studios' },
        { l: 'Dedicated Custom Studios', v: String(dedicated), s: 'Full CRUD & preview workflows' },
        { l: 'Active / Enabled Flags', v: enabledCnt + '/' + rows.length, s: Object.keys(draftConfig).length ? 'Unpublished flag edits pending' : 'Synced with D1 settings' }
      ].forEach(function (k) {
        kpiHost.appendChild(el('div', { class: 'cso-mod-kpi' }, [
          el('div', { class: 'cso-mod-kpi-label', text: k.l }),
          el('div', { class: 'cso-mod-kpi-val', text: k.v }),
          el('div', { class: 'cso-mod-kpi-sub', text: k.s })
        ]));
      });
    }

    function renderSuites() {
      clear(suiteWrap);
      var head = el('div', { class: 'cso-drawer-head' }, [
        el('strong', { text: 'Suite-by-Suite Coverage (' + folders.length + ' suites · click a pill to filter)' }),
        el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: suiteOpen ? 'Collapse' : 'Expand', onclick: function () { suiteOpen = !suiteOpen; renderSuites(); } })
      ]);
      suiteWrap.appendChild(head);
      if (!suiteOpen) return;
      var row = el('div', { class: 'cso-pill-row' });
      row.appendChild(el('button', { type: 'button', class: 'cso-pill' + (!folderSel.value ? ' cso-pill-active' : ''), text: 'All (' + rows.length + ')', onclick: function () { folderSel.value = ''; pageIdx = 0; draw(); renderSuites(); } }));
      folders.forEach(function (fo) {
        row.appendChild(el('button', {
          type: 'button',
          class: 'cso-pill' + (folderSel.value === fo.id ? ' cso-pill-active' : ''),
          text: fo.title + ' (' + fo.modules.length + ')',
          onclick: function () { folderSel.value = fo.id; pageIdx = 0; draw(); renderSuites(); }
        }));
      });
      suiteWrap.appendChild(row);
    }

    function openInspector(r, startTab) {
      clear(drawer);
      drawer.classList.remove('cso-hidden');
      var cfg = effectiveCfg(r.id);
      var tables = FOLDER_TABLES[r.folderId] || ['site_settings'];
      var pubRoute = FOLDER_PUBLIC_ROUTE[r.folderId] || '/';
      var mobileMode = false;

      var deskBtn = el('button', { type: 'button', class: 'cso-pill cso-pill-active', text: 'Desktop', onclick: function () { mobileMode = false; syncVp(); renderRight(); } });
      var mobBtn = el('button', { type: 'button', class: 'cso-pill', text: 'Mobile 375px', onclick: function () { mobileMode = true; syncVp(); renderRight(); } });
      function syncVp() {
        deskBtn.classList.toggle('cso-pill-active', !mobileMode);
        mobBtn.classList.toggle('cso-pill-active', mobileMode);
      }

      drawer.appendChild(el('div', { class: 'cso-drawer-head' }, [
        el('div', {}, [
          el('strong', { text: (startTab === 'config' ? 'Configure Module: ' : 'Preview Module: ') + r.title }),
          el('div', { class: 'cso-mod-muted', text: r.id + ' · ' + r.folderTitle })
        ]),
        el('div', { class: 'cso-mod-toolbar' }, [
          deskBtn, mobBtn,
          el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm cso-mod-btn-primary', text: 'Open Module →', onclick: function () { goTo([r.folderId, r.id]); } }),
          el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Close', onclick: function () { drawer.classList.add('cso-hidden'); } })
        ])
      ]));

      var left = el('div', { class: 'cso-mod-card' });
      var right = el('div', { class: 'cso-mod-card' });
      drawer.appendChild(el('div', { class: 'cso-mod-grid-2' }, [left, right]));

      left.appendChild(el('h4', { text: 'Bound D1 Tables & API Endpoints' }));
      left.appendChild(el('div', { class: 'cso-mod-toolbar' }, tables.map(function (t) { return badge('D1: ' + t, 'info'); })));
      left.appendChild(el('p', { class: 'cso-mod-muted', text: 'Endpoints: ' + r.eps.join(', ') }));
      left.appendChild(el('div', { class: 'cso-mod-toolbar' }, r.caps.map(function (c) { return badge(c, 'ok'); })));

      var enChk = el('input', { type: 'checkbox', checked: cfg.enabled });
      var pinChk = el('input', { type: 'checkbox', checked: cfg.pinned });
      var roleSel = el('select', { class: 'cso-mod-select' }, [
        el('option', { value: 'editor', text: 'editor (Staff & Admins)' }),
        el('option', { value: 'admin', text: 'admin (Admin-only)' })
      ]);
      roleSel.value = cfg.minRole || 'editor';
      var noteInp = el('input', { type: 'text', class: 'cso-mod-input', value: cfg.note || '', placeholder: 'Editorial note or rollout status…' });

      left.appendChild(el('h4', { text: 'Module Flags & Access Config' }));
      left.appendChild(el('label', { class: 'cso-check-label' }, [enChk, el('span', { text: 'Module Enabled' })]));
      left.appendChild(el('label', { class: 'cso-check-label' }, [pinChk, el('span', { text: 'Pin to Top Quick-Jump' })]));
      left.appendChild(el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Minimum Role' }), roleSel]));
      left.appendChild(el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Editorial Note' }), noteInp]));

      function collectEntry() {
        return { enabled: !!enChk.checked, pinned: !!pinChk.checked, minRole: roleSel.value, note: noteInp.value.trim() };
      }
      left.appendChild(el('div', { class: 'cso-mod-toolbar' }, [
        el('button', { type: 'button', class: 'cso-mod-btn', text: 'Save Draft', onclick: async function () {
          draftConfig[r.id] = collectEntry();
          try {
            await api('PUT', 'settings/module-registry', { modules: modConfig, draft: draftConfig, publish: false });
            toast('Module flag draft saved', 'success');
            renderKpis(); draw();
          } catch (e) { toast(e.message, 'crimson'); }
        } }),
        el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-primary', text: 'Publish Studio Config Live', onclick: async function () {
          modConfig[r.id] = collectEntry();
          delete draftConfig[r.id];
          try {
            await api('PUT', 'settings/module-registry', { modules: modConfig, draft: draftConfig, publish: true });
            toast('Studio config published live to D1!', 'success');
            renderKpis(); draw();
          } catch (e) { toast(e.message, 'crimson'); }
        } })
      ]));

      function renderRight() {
        clear(right);
        right.appendChild(el('div', { class: 'cso-mod-label', text: 'Target Public Route Preview (' + pubRoute + ' · ' + (mobileMode ? 'Mobile 375px' : 'Desktop') + ')' }));
        right.appendChild(el('div', { class: 'cso-preview-frame-wrap' }, [
          el('iframe', { class: mobileMode ? 'cso-preview-frame-mobile' : 'cso-preview-frame', src: pubRoute, title: 'Route preview ' + pubRoute })
        ]));
      }
      renderRight();
    }

    function draw() {
      renderKpis();
      var q = search.value.toLowerCase().trim(), f = folderSel.value;
      var shown = rows.filter(function (r) {
        var cfg = effectiveCfg(r.id);
        var modeOk = filterMode === 'All' ||
          (filterMode === 'Dedicated Studios' && isDedicated(r)) ||
          (filterMode === 'D1 + Edge Wired' && r.eps[0] !== '(client-side studio)') ||
          (filterMode === 'Pinned' && cfg.pinned) ||
          (filterMode === 'Disabled' && !cfg.enabled);
        return modeOk && (!f || r.folderId === f) && (!q || (r.id + ' ' + r.title + ' ' + r.folderTitle + ' ' + r.eps.join(' ')).toLowerCase().indexOf(q) >= 0);
      });
      shown.sort(function (a, b) {
        var pa = effectiveCfg(a.id).pinned ? 1 : 0, pb = effectiveCfg(b.id).pinned ? 1 : 0;
        return pb - pa;
      });

      var pSize = pageSizeSel.value === 'all' ? Math.max(shown.length, 1) : Number(pageSizeSel.value) || 25;
      var totalPages = Math.max(1, Math.ceil(shown.length / pSize));
      if (pageIdx >= totalPages) pageIdx = totalPages - 1;
      var slice = shown.slice(pageIdx * pSize, (pageIdx + 1) * pSize);

      clear(tableHost);
      var pager = el('div', { class: 'cso-drawer-head' }, [
        el('span', { class: 'cso-mod-muted', text: 'Showing ' + (shown.length ? pageIdx * pSize + 1 : 0) + '–' + Math.min((pageIdx + 1) * pSize, shown.length) + ' of ' + shown.length + ' matching modules (' + rows.length + ' total)' }),
        el('div', { class: 'cso-mod-toolbar' }, [
          el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: '← Prev', disabled: pageIdx <= 0, onclick: function () { if (pageIdx > 0) { pageIdx--; draw(); } } }),
          el('span', { class: 'cso-mod-muted', text: 'Page ' + (pageIdx + 1) + ' / ' + totalPages }),
          el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Next →', disabled: pageIdx >= totalPages - 1, onclick: function () { if (pageIdx < totalPages - 1) { pageIdx++; draw(); } } })
        ])
      ]);
      tableHost.appendChild(pager);

      tableHost.appendChild(safeTable(['Module', 'Suite', 'Capabilities & Flags', 'API / Data Endpoints', 'Actions'], slice.map(function (r) {
        var cfg = effectiveCfg(r.id);
        var capWrap = el('div', { class: 'cso-mod-toolbar' }, r.caps.map(function (c) { return badge(c, 'ok'); }));
        if (cfg.pinned) capWrap.appendChild(badge('Pinned', 'info'));
        if (!cfg.enabled) capWrap.appendChild(badge('Disabled', 'warn'));
        if (cfg.minRole === 'admin') capWrap.appendChild(badge('Admin-only', 'warn'));
        return el('tr', {}, [
          el('td', {}, [el('strong', { text: r.title }), el('div', { class: 'cso-mod-muted', text: r.id })]),
          el('td', { text: r.folderTitle }),
          el('td', {}, capWrap),
          el('td', { class: 'cso-mod-muted', text: r.eps.join('  ') }),
          el('td', {}, el('div', { class: 'cso-mod-toolbar' }, [
            el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Preview', onclick: function () { openInspector(r, 'preview'); } }),
            el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Configure', onclick: function () { openInspector(r, 'config'); } }),
            el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm cso-mod-btn-primary', text: 'Open →', onclick: function () { goTo([r.folderId, r.id]); } })
          ]))
        ]);
      })));
    }

    Promise.all([fetchNav(), api('GET', 'settings/module-registry').catch(function () { return { modules: {}, draft: {} }; })]).then(function (res) {
      var nav = res[0], reg = res[1] || {};
      modConfig = reg.modules || {};
      draftConfig = reg.draft || {};
      folders = nav.folders || [];
      folders.forEach(function (fo) {
        folderSel.appendChild(el('option', { value: fo.id, text: fo.title + ' (' + fo.modules.length + ')' }));
        fo.modules.forEach(function (m) {
          var route = window.CSOLive && window.CSOLive.routes && window.CSOLive.routes[m.id];
          var eps = (DIR_EP[fo.id] || []).slice();
          if (route && window.CSOLive.resolveRoute) {
            var map = { 'current-affairs': '/api/admin/current-affairs', jobs: '/api/admin/jobs', 'mock-tests': '/api/admin/mock-tests', syllabus: '/api/admin/resources', pyq: '/api/admin/resources', media: '/api/admin/media', users: '/api/admin/users', banner: '/api/admin/banner', audit: '/api/admin/audit', 'audit/security': '/api/admin/audit', incidents: '/api/admin/incidents', operations: '/api/admin/maintenance', dashboard: '/api/admin/stats' };
            var ep = map[window.CSOLive.resolveRoute(fo.id, m.id)[0]];
            if (ep && eps.indexOf(ep) < 0) eps.push(ep);
          }
          rows.push({ folderId: fo.id, folderTitle: fo.title, id: m.id, title: m.title, eps: eps.length ? eps : ['(client-side studio)'], caps: dirCaps(fo.id, eps) });
        });
      });
      renderSuites();
      draw();
    }).catch(function (e) { fail(tableHost, e); });

    search.addEventListener('input', function () { pageIdx = 0; draw(); });
    folderSel.addEventListener('change', function () { pageIdx = 0; renderSuites(); draw(); });
    pageSizeSel.addEventListener('change', function () { pageIdx = 0; draw(); });
  }

  /* =========================================================================
     MAIN DISPATCHER
     ========================================================================= */
  function render(folderId, moduleId, root, actions) {
    // Folder 01 specialized tools
    if (moduleId === 'module-01-001') { renderOverviewCC(root, actions); return true; }
    if (moduleId === 'module-01-002') { renderEdgeStudio(root, actions); return true; }
    if (moduleId === 'module-01-003') { renderLaunchpad(root, actions); return true; }
    if (moduleId === 'module-01-004') { renderAuditTimeline(root, actions); return true; }
    if (moduleId === 'module-01-005') { renderAlertCenter(root, actions); return true; }
    if (moduleId === 'module-01-006') { renderApprovalQueue(root, actions); return true; }
    if (moduleId === 'module-01-007') { renderAnalyticsStudio(root, actions); return true; }
    if (moduleId === 'module-01-008') { renderCommandDirectory(root, actions); return true; }

    // Folder 02: Website Pages & Builder
    if (folderId === 'folder-02' || moduleId.startsWith('module-02-')) {
      return renderFolder02(folderId, moduleId, root, actions);
    }

    // Folder 03: Website Information & Legal
    if (folderId === 'folder-03' || moduleId.startsWith('module-03-')) {
      return renderLegalStudio(moduleId, root, actions);
    }

    // Folder 04: Content & Publishing specialized modules
    if (folderId === 'folder-04' && renderFolder04(moduleId, root, actions)) {
      return true;
    }

    // Folder 06 & Directory Folders 20-23: Category & Navigation Tree Studios
    if (folderId === 'folder-06' || folderId === 'folder-jobs-careers' || folderId === 'folder-schemes-benefits' || folderId === 'folder-study-library' || folderId === 'folder-community') {
      var meta = moduleMeta(folderId, moduleId);
      return renderCategoryTreeStudio(meta.title, meta.folderTitle + ' — Interactive navigation & taxonomy tree hydrated from site-manifest.json.', root, actions);
    }

    // Folder 07: R2 Diagnostics modules
    if (folderId === 'folder-07' && renderFolder07(moduleId, root, actions)) {
      return true;
    }

    // Folder 10: Analytics
    if (folderId === 'folder-10' || moduleId.startsWith('module-ana-')) {
      renderWebsiteAnalytics(root, actions);
      return true;
    }

    // Folder 11: Communications
    if (folderId === 'folder-11' || moduleId.startsWith('module-comms-')) {
      return renderCommsStudio(moduleId, root, actions);
    }

    // Folder 13: SEO, Search & Discovery
    if (folderId === 'folder-13' || moduleId.startsWith('module-seo-')) {
      return renderSeoStudio(moduleId, root, actions);
    }

    // Folder 14: Events & Scheduling -> Live Editorial/Deadline Calendar
    if (folderId === 'folder-14' && moduleId !== 'module-14-006' && moduleId !== 'module-14-007') {
      return renderFolder04('module-04-009', root, actions);
    }

    // Folder 15: Integrations & Cloudflare Edge -> Live Edge Prober
    if (folderId === 'folder-15') {
      renderLiveSiteStatus(root, actions);
      return true;
    }

    // Folder 19: Master Feature Registry
    if (folderId === 'folder-19' || moduleId.startsWith('module-19-') || moduleId.startsWith('module-mfr-')) {
      renderMasterRegistry(root, actions);
      return true;
    }

    // Folder 08 (Payments Config), Folder 12 (Marketing), Folder 18 (Settings)
    if (folderId === 'folder-08' || folderId === 'folder-12' || folderId === 'folder-18') {
      return renderConfigStudio(folderId, moduleId, root, actions);
    }

    return false;
  }

  window.CSORestoredModules = {
    render: render
  };
})(window, document);
