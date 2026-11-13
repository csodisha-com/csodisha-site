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
    var previewHost = el('div', {});
    var tableHost = el('div', {});

    var allPages = [];
    var state = { q: '', cat: '', status: '' };
    var searchInp = el('input', { type: 'search', class: 'cso-mod-input', placeholder: 'Search title, route, or meta description…' });
    var catRow = el('div', { class: 'cso-pill-row' });
    var statusRow = el('div', { class: 'cso-pill-row' });

    function openPreview(p) {
      clear(previewHost);
      var mobile = false;
      var src = p.route + (p.route.indexOf('?') === -1 ? '?' : '&') + 'preview=1&t=' + Date.now();
      var frame = el('iframe', { src: src, class: 'cso-preview-frame', title: 'Live Preview: ' + p.route });
      var toggleBtn = el('button', {
        type: 'button',
        class: 'cso-mod-btn cso-mod-btn-sm',
        text: 'Mobile 375px',
        onclick: function () {
          mobile = !mobile;
          frame.className = mobile ? 'cso-preview-frame-mobile' : 'cso-preview-frame';
          toggleBtn.textContent = mobile ? 'Desktop 100%' : 'Mobile 375px';
        }
      });
      previewHost.appendChild(el('div', { class: 'cso-drawer' }, [
        el('div', { class: 'cso-drawer-head' }, [
          el('strong', { text: 'Live Preview — ' + p.route }),
          el('div', { class: 'cso-mod-toolbar' }, [
            toggleBtn,
            el('a', { href: p.route, target: '_blank', rel: 'noopener noreferrer', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Open Live ↗' }),
            el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Close', onclick: function () { clear(previewHost); } })
          ])
        ]),
        el('div', { class: 'cso-preview-frame-wrap' }, [frame])
      ]));
    }

    function openQuickEdit(p) {
      clear(drawerHost);
      var titleInp = el('input', { type: 'text', class: 'cso-mod-input', value: p.title || '' });
      var metaInp = el('textarea', { class: 'cso-mod-textarea' });
      metaInp.value = p.meta_description || '';
      var catSel = el('select', { class: 'cso-mod-select' }, [
        'Core Portal', 'Candidate Workspace', 'Information & Legal', 'Exam Guide', 'Recruitment'
      ].map(function (c) { return el('option', { value: c, text: c, selected: p.category === c }); }));
      var heroTitleInp = el('input', { type: 'text', class: 'cso-mod-input', value: p.hero_title || '' });
      var heroSubInp = el('input', { type: 'text', class: 'cso-mod-input', value: p.hero_subtitle || '' });
      var ctaLblInp = el('input', { type: 'text', class: 'cso-mod-input', value: p.cta_label || '' });
      var ctaUrlInp = el('input', { type: 'text', class: 'cso-mod-input', value: p.cta_url || '' });
      var statusSel = el('select', { class: 'cso-mod-select' }, [
        'published', 'draft', 'scheduled', 'archived', 'trash'
      ].map(function (s) { return el('option', { value: s, text: s, selected: (p.status || 'published') === s }); }));

      var saveBtn = el('button', {
        type: 'button',
        class: 'cso-mod-btn cso-mod-btn-primary',
        text: 'Save & Publish Live',
        onclick: async function () {
          saveBtn.disabled = true;
          try {
            await api('PUT', 'pages', {
              route: p.route,
              title: titleInp.value.trim(),
              meta_description: metaInp.value.trim(),
              category: catSel.value,
              hero_title: heroTitleInp.value.trim(),
              hero_subtitle: heroSubInp.value.trim(),
              cta_label: ctaLblInp.value.trim(),
              cta_url: ctaUrlInp.value.trim(),
              status: statusSel.value,
              note: 'Quick Edit SEO & Hero'
            });
            toast('Saved & pushed live: ' + p.route, 'success');
            clear(drawerHost);
            await loadPages();
          } catch (e) {
            toast(e.message, 'crimson');
          } finally {
            saveBtn.disabled = false;
          }
        }
      });

      drawerHost.appendChild(el('div', { class: 'cso-drawer' }, [
        el('div', { class: 'cso-drawer-head' }, [
          el('div', {}, [el('strong', { text: 'Quick Edit SEO & Hero — ' }), el('code', { text: p.route })]),
          el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Close', onclick: function () { clear(drawerHost); } })
        ]),
        el('div', { class: 'cso-mod-grid-2' }, [
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Page / Meta Title' }), titleInp]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Category' }), catSel]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Hero Headline' }), heroTitleInp]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Hero Subtitle' }), heroSubInp]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'CTA Label' }), ctaLblInp]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'CTA URL' }), ctaUrlInp]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Meta Description' }), metaInp]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Publish Status' }), statusSel])
        ]),
        el('div', { class: 'cso-mod-toolbar' }, [
          saveBtn,
          el('button', {
            type: 'button',
            class: 'cso-mod-btn',
            text: 'Open in Visual Builder',
            onclick: function () { f02State.builderRoute = p.route; window.selectModule && window.selectModule('folder-02', 'module-02-003'); }
          })
        ])
      ]));
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
          onclick: function () { state.cat = c; renderPills(); drawTable(); }
        }));
      });

      clear(statusRow);
      statusRow.appendChild(el('span', { class: 'cso-mod-muted', text: 'Status:' }));
      ['', 'published', 'draft', 'scheduled', 'trash'].forEach(function (s) {
        statusRow.appendChild(el('button', {
          type: 'button',
          class: 'cso-pill' + (state.status === s ? ' is-active' : ''),
          text: s || 'All',
          onclick: function () { state.status = s; renderPills(); drawTable(); }
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

      var rows = filtered.map(function (p) {
        return el('tr', {}, [
          el('td', {}, [
            el('strong', { text: p.title || p.route }),
            el('div', { class: 'cso-inline-row' }, [el('code', { text: p.route }), f02SourceBadge(p.source)])
          ]),
          el('td', { text: p.category || '—' }),
          el('td', {}, [
            f02StatusBadge(p.status),
            p.revisions ? el('span', { class: 'cso-mod-muted', text: ' · ' + p.revisions + ' rev' }) : null
          ]),
          el('td', { text: (p.meta_description || '').slice(0, 72) + ((p.meta_description || '').length > 72 ? '…' : '') || '—' }),
          el('td', {}, el('div', { class: 'cso-mod-toolbar' }, [
            el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm cso-mod-btn-primary', text: 'Quick Edit', onclick: function () { openQuickEdit(p); } }),
            el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Preview', onclick: function () { openPreview(p); } }),
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

      tableHost.appendChild(el('p', { class: 'cso-mod-muted', text: 'Showing ' + filtered.length + ' of ' + allPages.length + ' routes (static + live D1 overrides + dynamic pages).' }));
      tableHost.appendChild(safeTable(['Page & Route', 'Category', 'Status', 'Meta Description', 'Actions'], rows));
    }

    async function loadPages() {
      clear(tableHost);
      tableHost.appendChild(el('p', { class: 'cso-mod-muted', text: 'Loading live pages from /api/admin/pages…' }));
      try {
        var d = await api('GET', 'pages');
        allPages = d.pages || [];
        var overrides = allPages.filter(function (p) { return p.source === 'override' || p.source === 'dynamic'; }).length;
        var drafts = allPages.filter(function (p) { return p.status === 'draft' || p.status === 'scheduled'; }).length;
        var trashed = allPages.filter(function (p) { return p.status === 'trash' || p.status === 'archived'; }).length;

        clear(kpiHost);
        [
          ['Total Routes', allPages.length],
          ['Live Overrides / Custom', overrides],
          ['Drafts & Scheduled', drafts],
          ['Trash & Archived', trashed]
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

    searchInp.addEventListener('input', function () { state.q = searchInp.value; drawTable(); });

    renderBanner(shell, 'All Website Pages', 'Live merged inventory of all 44 static portals + D1 live overrides + custom pages.', [
      el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-primary', text: '+ Create New Page', onclick: function () { window.selectModule && window.selectModule('folder-02', 'module-02-002'); } }),
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'Open Visual Builder', onclick: function () { window.selectModule && window.selectModule('folder-02', 'module-02-003'); } }),
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'Refresh', onclick: loadPages })
    ]);

    shell.appendChild(kpiHost);
    shell.appendChild(el('div', { class: 'cso-mod-card' }, [
      el('div', { class: 'cso-mod-field' }, [searchInp]),
      catRow,
      statusRow
    ]));
    shell.appendChild(drawerHost);
    shell.appendChild(previewHost);
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

    var shell = el('div', { class: 'cso-mod-shell' });
    var titleInp = el('input', { type: 'text', class: 'cso-mod-input', placeholder: 'e.g. OPSC OAS 2026 Complete Guide', value: tpl ? tpl.name : '' });
    var slugInp = el('input', { type: 'text', class: 'cso-mod-input', placeholder: '/opsc-oas-2026/', value: tpl ? '/' + tpl.id + '/' : '' });
    var catSel = el('select', { class: 'cso-mod-select' }, [
      'Core Portal', 'Candidate Workspace', 'Information & Legal', 'Exam Guide', 'Recruitment'
    ].map(function (c) { return el('option', { value: c, text: c, selected: tpl && tpl.category === c }); }));
    var metaDescInp = el('textarea', { class: 'cso-mod-textarea', placeholder: 'Concise 140–160 char search snippet for Google…' });
    metaDescInp.value = tpl ? (tpl.meta_description || '') : '';

    var heroTitleInp = el('input', { type: 'text', class: 'cso-mod-input', placeholder: 'Hero H1 headline', value: tpl ? (tpl.hero_title || '') : '' });
    var heroSubInp = el('input', { type: 'text', class: 'cso-mod-input', placeholder: 'Hero supporting subtitle', value: tpl ? (tpl.hero_subtitle || '') : '' });
    var ctaLblInp = el('input', { type: 'text', class: 'cso-mod-input', placeholder: 'e.g. Apply Online', value: tpl ? (tpl.cta_label || '') : '' });
    var ctaUrlInp = el('input', { type: 'text', class: 'cso-mod-input', placeholder: '/jobs-careers/', value: tpl ? (tpl.cta_url || '') : '' });
    var schedInp = el('input', { type: 'datetime-local', class: 'cso-mod-input' });

    var starterBlocks = tpl ? JSON.parse(JSON.stringify(tpl.blocks || [])) : [
      { type: 'hero', title: 'New Odisha Exam Portal', text: 'Verified syllabus, official links, and live alerts.', label: 'Explore Jobs', url: '/jobs-careers/' },
      { type: 'notice', title: 'Important Notice', text: 'Always verify final dates on the official commission portal.' }
    ];
    var blocksHost = el('div', { class: 'cso-mod-shell' });

    var titleCount = el('div', { class: 'cso-char-count' });
    var descCount = el('div', { class: 'cso-char-count' });
    var gsUrl = el('div', { class: 'cso-gs-url' });
    var gsTitle = el('div', { class: 'cso-gs-title' });
    var gsDesc = el('div', { class: 'cso-gs-desc' });
    var resultBanner = el('div', {});

    function updateSnippet() {
      var t = titleInp.value.trim();
      var d = metaDescInp.value.trim();
      var r = f02NormalizeRoute(slugInp.value || '/new-page/');
      titleCount.textContent = t.length + ' / 60 chars';
      titleCount.className = 'cso-char-count' + (t.length > 60 ? ' is-over' : '');
      descCount.textContent = d.length + ' / 160 chars';
      descCount.className = 'cso-char-count' + (d.length > 160 ? ' is-over' : '');
      gsUrl.textContent = 'https://csodisha.com' + r;
      gsTitle.textContent = t || 'Page Title — Common Sense Odisha';
      gsDesc.textContent = d || 'Meta description preview will appear here as you type…';
    }

    function renderInitialBlocks() {
      clear(blocksHost);
      starterBlocks.forEach(function (b, idx) {
        var bTitle = el('input', { type: 'text', class: 'cso-mod-input', value: b.title || '', placeholder: 'Block Title' });
        var bText = el('input', { type: 'text', class: 'cso-mod-input', value: b.text || '', placeholder: 'Block Text' });
        bTitle.addEventListener('input', function () { b.title = bTitle.value; });
        bText.addEventListener('input', function () { b.text = bText.value; });
        blocksHost.appendChild(el('div', { class: 'cso-builder-block' }, [
          el('div', { class: 'cso-builder-block-head' }, [
            badge((idx + 1) + '. ' + b.type, 'info'),
            el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-danger cso-mod-btn-sm', text: 'Remove', onclick: function () { starterBlocks.splice(idx, 1); renderInitialBlocks(); } })
          ]),
          el('div', { class: 'cso-mod-grid-2' }, [bTitle, bText])
        ]));
      });
    }

    titleInp.addEventListener('input', function () {
      if (!slugInp.dataset.touched) {
        var s = titleInp.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        slugInp.value = '/' + (s || 'new-page') + '/';
      }
      if (!heroTitleInp.dataset.touched && !tpl) heroTitleInp.value = titleInp.value;
      updateSnippet();
    });
    slugInp.addEventListener('input', function () { slugInp.dataset.touched = '1'; updateSnippet(); });
    heroTitleInp.addEventListener('input', function () { heroTitleInp.dataset.touched = '1'; });
    metaDescInp.addEventListener('input', updateSnippet);

    async function submitPage(status) {
      var route = f02NormalizeRoute(slugInp.value);
      if (!titleInp.value.trim()) { toast('Page title is required', 'crimson'); return; }
      if (status === 'scheduled' && !schedInp.value) { toast('Select a schedule date & time first', 'crimson'); return; }
      var payload = {
        route: route,
        title: titleInp.value.trim(),
        meta_description: metaDescInp.value.trim(),
        category: catSel.value,
        hero_title: heroTitleInp.value.trim() || titleInp.value.trim(),
        hero_subtitle: heroSubInp.value.trim(),
        cta_label: ctaLblInp.value.trim(),
        cta_url: ctaUrlInp.value.trim(),
        blocks_json: JSON.stringify(starterBlocks),
        status: status,
        publish_at: status === 'scheduled' ? new Date(schedInp.value).toISOString() : null,
        note: 'Created via Create New Page Wizard'
      };
      try {
        var res = await api('POST', 'pages', payload);
        toast('Page ' + status + ': ' + res.route, 'success');
        clear(resultBanner);
        resultBanner.appendChild(el('div', { class: 'cso-drawer' }, [
          el('div', { class: 'cso-inline-row' }, [
            badge(status, status === 'published' ? 'ok' : 'warn'),
            el('strong', { text: 'Saved route ' + res.route }),
            status === 'published' ? el('a', { href: res.route, target: '_blank', rel: 'noopener noreferrer', class: 'cso-mod-btn cso-mod-btn-primary cso-mod-btn-sm', text: 'Open Live Page ↗' }) : null,
            el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Edit in Visual Builder', onclick: function () { f02State.builderRoute = res.route; window.selectModule && window.selectModule('folder-02', 'module-02-003'); } })
          ])
        ]));
      } catch (e) {
        toast(e.message, 'crimson');
      }
    }

    renderBanner(shell, 'Create New Page', 'Publish real public routes on csodisha.com/<slug>/ via POST /api/admin/pages.', [
      el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-primary', text: 'Publish Live Now', onclick: function () { submitPage('published'); } }),
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'Save Draft', onclick: function () { submitPage('draft'); } }),
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'Schedule', onclick: function () { submitPage('scheduled'); } })
    ]);

    shell.appendChild(resultBanner);
    shell.appendChild(el('div', { class: 'cso-mod-grid-2' }, [
      el('div', { class: 'cso-mod-card' }, [
        el('h3', { text: 'Route & SEO Metadata' }),
        el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Page Title (60 chars)' }), titleInp, titleCount]),
        el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Public Route / Slug' }), slugInp]),
        el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Category' }), catSel]),
        el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Meta Description (160 chars)' }), metaDescInp, descCount]),
        el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Schedule Date/Time (if scheduling)' }), schedInp])
      ]),
      el('div', { class: 'cso-mod-shell' }, [
        el('div', { class: 'cso-mod-card' }, [
          el('h3', { text: 'Google Snippet Preview' }),
          el('div', { class: 'cso-google-snippet' }, [gsUrl, gsTitle, gsDesc])
        ]),
        el('div', { class: 'cso-mod-card' }, [
          el('h3', { text: 'Hero & Call-to-Action' }),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Hero Title' }), heroTitleInp]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Hero Subtitle' }), heroSubInp]),
          el('div', { class: 'cso-mod-grid-2' }, [
            el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'CTA Label' }), ctaLblInp]),
            el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'CTA URL' }), ctaUrlInp])
          ])
        ])
      ])
    ]));

    shell.appendChild(el('div', { class: 'cso-mod-card' }, [
      el('div', { class: 'cso-drawer-head' }, [
        el('h3', { text: 'Initial Content Blocks' }),
        el('div', { class: 'cso-mod-toolbar' }, [
          el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: '+ Rich Text', onclick: function () { starterBlocks.push({ type: 'richtext', title: 'Section', text: 'Add detailed information here.' }); renderInitialBlocks(); } }),
          el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: '+ Notice', onclick: function () { starterBlocks.push({ type: 'notice', title: 'Notice', text: 'Important update for candidates.' }); renderInitialBlocks(); } })
        ])
      ]),
      blocksHost
    ]));

    root.appendChild(shell);
    updateSnippet();
    renderInitialBlocks();
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
    var host = el('div', { class: 'cso-mod-shell' }), maint = el('div', { class: 'cso-mod-card' }), diffPre = el('pre', { class: 'cso-code-pre cso-hidden' });
    renderBanner(shell, 'Command Launchpad & Maintenance Studio', 'Create, import, upload and back up live D1/R2 content; run lifecycle maintenance.');
    shell.appendChild(host); shell.appendChild(maint); root.appendChild(shell);
    var fileInp = el('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp,application/pdf', class: 'cso-hidden' });
    fileInp.addEventListener('change', async function () {
      if (!fileInp.files[0]) return;
      var fd = new FormData(); fd.append('file', fileInp.files[0]);
      try { var d = await api('POST', 'media/upload', fd, true); toast('Uploaded to R2: ' + (d.key || d.object_key || 'ok'), 'success'); load(); } catch (e) { toast(e.message, 'crimson'); }
      fileInp.value = '';
    });
    shell.appendChild(fileInp);
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
        var r = await Promise.all([api('GET', 'stats'), api('GET', 'jobs?limit=100'), api('GET', 'current-affairs?limit=100'), api('GET', 'maintenance').catch(function () { return {}; })]);
        var s = r[0], jobs = r[1].items || [], cas = r[2].items || [], cron = (r[3] && r[3].last_cron_run) || s.last_cron_run;
        var open = function (rt) { return function () { window.CSOStudio && window.CSOStudio.openRoute(rt); }; };
        var cards = [
          ['Job Alerts', (s.jobs && s.jobs.total || 0) + ' total · ' + (s.jobs && s.jobs.live || 0) + ' live', [['Create', open('jobs/new'), true], ['Manage', function () { window.selectModule('folder-05', 'module-05-008'); }]]],
          ['Current Affairs', (s.current_affairs && s.current_affairs.total || 0) + ' total · ' + (s.current_affairs && s.current_affairs.live || 0) + ' live', [['Create', open('current-affairs/new'), true], ['Manage', function () { window.selectModule('folder-04', 'module-04-004'); }]]],
          ['Mock Tests', (s.mock_tests && s.mock_tests.total || 0) + ' total · ' + (s.mock_tests && s.mock_tests.live || 0) + ' live', [['Create', open('mock-tests/new'), true], ['Manage', function () { window.selectModule('folder-05', 'module-05-014'); }]]],
          ['Question CSV/JSON Import', 'Dry-run + commit import inside a mock test', [['Open Mock Tests', function () { window.selectModule('folder-05', 'module-05-012'); }, true]]],
          ['R2 Media Upload', (s.media && s.media.total || 0) + ' assets · ' + Math.round((s.media && s.media.bytes || 0) / 1024) + ' KB', [['Upload File', function () { fileInp.click(); }, true], ['Library', function () { window.selectModule('folder-07', 'module-07-001'); }]]],
          ['D1 JSON Backup', 'Download posts, tests, resources and audit', [['Download Backup', backup, true]]],
          ['Odisha Starter Content', 'Idempotently seed OPSC/OSSC/OSSSC jobs, digests, tests & syllabus', [['Seed Odisha Starter Content', async function () {
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
        host.appendChild(el('div', { class: 'cso-mod-grid-3' }, cards.map(function (c) {
          return el('div', { class: 'cso-mod-card' }, [el('h3', { text: c[0] }), el('p', { class: 'cso-mod-muted', text: c[1] }),
            el('div', { class: 'cso-mod-toolbar' }, c[2].map(function (b) { return el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm' + (b[2] ? ' cso-mod-btn-primary' : ''), text: b[0], onclick: b[1] }); }))]);
        })));
        var soon = jobs.filter(function (j) { return j.status === 'published' && j.last_date && Date.parse(j.last_date) - Date.now() < 7 * 86400000 && Date.parse(j.last_date) > Date.now() - 86400000; });
        var sched = jobs.concat(cas).filter(function (x) { return x.status === 'scheduled'; });
        clear(maint);
        maint.appendChild(el('h3', { text: 'Scheduled Lifecycle & Maintenance' }));
        maint.appendChild(el('p', { class: 'cso-mod-muted', text: 'Last cron run: ' + (cron ? JSON.stringify(cron) : 'no run recorded yet') }));
        maint.appendChild(el('div', { class: 'cso-mod-grid-2' }, [
          el('div', {}, [el('h4', { text: 'Upcoming scheduled (' + sched.length + ')' }), safeTable(['Title', 'Publishes'], sched.slice(0, 8).map(function (x) { return el('tr', {}, [el('td', { text: x.title }), el('td', { text: x.published_at || '—' })]); }))]),
          el('div', {}, [el('h4', { text: 'Expiring within 7 days (' + soon.length + ')' }), safeTable(['Title', 'Last date'], soon.slice(0, 8).map(function (x) { return el('tr', {}, [el('td', { text: x.title }), el('td', { text: x.last_date })]); }))])
        ]));
        maint.appendChild(el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-primary', text: 'Run Maintenance & Cleanup Now', onclick: async function () {
          try {
            var before = snap(await api('GET', 'stats'));
            var res = await api('POST', 'maintenance/run');
            var after = snap(await api('GET', 'stats'));
            var diff = Object.keys(after).map(function (k) { return k + ': ' + before[k] + ' → ' + after[k] + (before[k] !== after[k] ? '  (changed)' : ''); });
            diffPre.classList.remove('cso-hidden');
            diffPre.textContent = diff.join('\n') + '\n\nrun summary:\n' + JSON.stringify(res.last_cron_run || res, null, 2);
            toast('Maintenance complete', 'success');
          } catch (e) { toast(e.status === 403 ? 'Maintenance requires admin role' : e.message, 'crimson'); }
        } }));
        maint.appendChild(diffPre);
      } catch (e) { fail(host, e); }
    }
    load();
  }

  function renderAuditTimeline(root, actions) {
    addHeaderPill(actions, '● Live Audit Timeline');
    var shell = el('div', { class: 'cso-mod-shell' }), host = el('div', {});
    var items = [], kind = 'All';
    var q = el('input', { type: 'text', class: 'cso-mod-input', placeholder: 'Search action or actor…' });
    var actor = el('input', { type: 'text', class: 'cso-mod-input', placeholder: 'Filter by actor email…' });
    renderBanner(shell, 'Live Audit Timeline & Diff Inspector', 'Real entries from /api/admin/audit grouped by date.', [el('button', { type: 'button', class: 'cso-mod-btn', text: 'Reload', onclick: load })]);
    shell.appendChild(pills(['All', 'Create', 'Update', 'Publish', 'Delete', 'Cron/System'], function (k) { kind = k; draw(); }));
    shell.appendChild(el('div', { class: 'cso-mod-grid-2' }, [q, actor]));
    shell.appendChild(host); root.appendChild(shell);
    q.addEventListener('input', draw); actor.addEventListener('input', draw);
    function match(a) {
      var act = String(a.action || '');
      if (kind === 'Create' && !/create/.test(act)) return false;
      if (kind === 'Update' && !/update|role_change|deactivate|resolved/.test(act)) return false;
      if (kind === 'Publish' && !/publish/.test(act)) return false;
      if (kind === 'Delete' && !/delete/.test(act)) return false;
      if (kind === 'Cron/System' && !(/maintenance|cron/.test(act) || !a.actor_email)) return false;
      if (actor.value && !String(a.actor_email || 'system').toLowerCase().includes(actor.value.toLowerCase())) return false;
      var s = q.value.toLowerCase();
      return !s || act.toLowerCase().includes(s) || String(a.actor_email || '').toLowerCase().includes(s);
    }
    function jump(a) {
      var act = String(a.action || '');
      var map = [[/^jobs\./, ['folder-05', 'module-05-008']], [/^current-affairs\./, ['folder-04', 'module-04-004']], [/^mock/, ['folder-05', 'module-05-014']], [/^banner/, ['folder-04', 'module-04-005']], [/^resource/, ['folder-05', 'module-05-010']], [/^user/, ['folder-09', 'module-09-001']], [/^incident/, ['folder-16', 'module-16-013']]];
      for (var i = 0; i < map.length; i++) if (map[i][0].test(act)) return map[i][1];
      return null;
    }
    function draw() {
      clear(host);
      var shown = items.filter(match), lastDay = '';
      host.appendChild(el('p', { class: 'cso-mod-muted', text: shown.length + ' of ' + items.length + ' events' }));
      shown.forEach(function (a) {
        var day = String(a.created_at || '').slice(0, 10);
        if (day !== lastDay) { host.appendChild(el('h4', { class: 'cso-audit-day', text: day || 'Unknown date' })); lastDay = day; }
        var meta = {}; try { meta = JSON.parse(a.metadata_json || '{}'); } catch (_) { meta = { raw: a.metadata_json }; }
        var det = el('details', { class: 'cso-audit-row' });
        det.appendChild(el('summary', {}, [badge(a.action, /delete/.test(a.action) ? 'err' : /publish/.test(a.action) ? 'ok' : 'info'), ' ' + (a.actor_email || 'system') + ' · ' + (a.created_at || '')]));
        var body = el('div', { class: 'cso-mod-card' });
        body.appendChild(el('p', { class: 'cso-mod-muted', text: 'Target: ' + (a.target_type || '—') + ' / ' + (a.target_id || '—') + ' · IP ' + (a.ip_address || '—') }));
        body.appendChild(el('pre', { class: 'cso-code-pre', text: JSON.stringify(meta, null, 2) }));
        var j = jump(a);
        var bar = el('div', { class: 'cso-mod-toolbar' });
        if (j) bar.appendChild(el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-primary cso-mod-btn-sm', text: 'Jump to Record', onclick: function () { window.selectModule(j[0], j[1]); } }));
        if (/^jobs\./.test(a.action)) bar.appendChild(openLink('/jobs-careers/'));
        if (/^current-affairs\./.test(a.action)) bar.appendChild(openLink('/current-affairs/'));
        bar.appendChild(el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Copy JSON', onclick: function () { navigator.clipboard && navigator.clipboard.writeText(JSON.stringify(a, null, 2)); toast('Copied', 'success'); } }));
        body.appendChild(bar); det.appendChild(body); host.appendChild(det);
      });
    }
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
    var shell = el('div', { class: 'cso-mod-shell' }), host = el('div', { class: 'cso-mod-shell' });
    var sev = 'All', alerts = [], acked = {};
    try { acked = JSON.parse(localStorage.getItem('cso_ack_alerts') || '{}'); } catch (_) { acked = {}; }
    renderBanner(shell, 'Administrative Notifications', 'Actionable alerts computed live from D1, health probes and the sitewide broadcast banner (/api/admin/banner).', [el('button', { type: 'button', class: 'cso-mod-btn', text: 'Refresh', onclick: load })]);
    shell.appendChild(pills(['All', 'Critical', 'Warning', 'Info'], function (s) { sev = s; draw(); }));
    shell.appendChild(host); root.appendChild(shell);
    var alertHost = el('div', {}), composerHost = el('div', {});
    host.appendChild(alertHost); host.appendChild(composerHost);

    function draw() {
      clear(alertHost);
      var shown = alerts.filter(function (a) { return sev === 'All' || a.sev.toLowerCase() === sev.toLowerCase(); });
      var rows = shown.map(function (a) {
        var done = !!acked[a.id];
        return el('tr', {}, [
          el('td', {}, badge(a.sev, a.sev === 'Critical' ? 'err' : a.sev === 'Warning' ? 'warn' : 'info')),
          el('td', { text: a.msg }),
          el('td', {}, el('label', {}, [el('input', { type: 'checkbox', checked: done ? true : false, onchange: function (e) { if (e.target.checked) acked[a.id] = 1; else delete acked[a.id]; try { localStorage.setItem('cso_ack_alerts', JSON.stringify(acked)); } catch (_) {} } }), ' Ack'])),
          el('td', {}, el('div', { class: 'cso-mod-toolbar' }, a.actions))
        ]);
      });
      alertHost.appendChild(el('div', { class: 'cso-mod-card' }, [el('h3', { text: 'Actionable Alerts (' + shown.length + ')' }), safeTable(['Severity', 'Alert', 'Acknowledge', 'Resolve / Edit'], rows)]));
    }

    function btn(text, fn, primary) { return el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm' + (primary ? ' cso-mod-btn-primary' : ''), text: text, onclick: fn }); }

    function composer(b) {
      clear(composerHost);
      var head = el('input', { type: 'text', class: 'cso-mod-input', value: b.headline || '', maxlength: '160' });
      var ctx = el('textarea', { class: 'cso-mod-textarea', maxlength: '300' }); ctx.value = b.context || '';
      var cta = el('input', { type: 'text', class: 'cso-mod-input', value: b.ctaText || '', maxlength: '40' });
      var url = el('input', { type: 'text', class: 'cso-mod-input', value: b.ctaUrl || '' });
      var sevSel = el('select', { class: 'cso-mod-select' }, ['info', 'notice', 'urgent'].map(function (s) { return el('option', { value: s, text: s }); }));
      sevSel.value = b.severity || 'info';
      var act = el('input', { type: 'checkbox' }); act.checked = !!b.active;
      var prev = el('div', { class: 'cso-banner-preview' });
      function paint() {
        clear(prev);
        prev.className = 'cso-banner-preview cso-banner-' + sevSel.value + (act.checked ? '' : ' is-off');
        prev.appendChild(el('strong', { text: head.value || '(headline)' }));
        prev.appendChild(el('span', { text: ' ' + ctx.value }));
        if (cta.value) prev.appendChild(el('span', { class: 'cso-mod-badge cso-mod-badge-info', text: cta.value + ' → ' + (url.value || '/') }));
        if (!act.checked) prev.appendChild(el('em', { class: 'cso-mod-muted', text: ' (inactive — not visible to candidates)' }));
      }
      [head, ctx, cta, url].forEach(function (i) { i.addEventListener('input', paint); });
      sevSel.addEventListener('change', paint); act.addEventListener('change', paint);
      var save = el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-primary', text: 'Save & Publish Banner', onclick: async function () {
        try { await api('PUT', 'banner', { active: act.checked, severity: sevSel.value, headline: head.value, context: ctx.value, ctaText: cta.value, ctaUrl: url.value }); toast('Banner saved', 'success'); load(); }
        catch (e) { toast(e.message, 'crimson'); }
      } });
      composerHost.appendChild(el('div', { class: 'cso-mod-grid-2' }, [
        el('div', { class: 'cso-mod-card' }, [el('h3', { text: 'Broadcast Banner Composer' }),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Headline' }), head]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Context' }), ctx]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Severity' }), sevSel]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Button text' }), cta]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Button link' }), url]),
          el('label', {}, [act, ' Active on homepage']), save]),
        el('div', { class: 'cso-mod-card' }, [el('h3', { text: 'Real-Time Candidate Preview' }), prev, el('p', { class: 'cso-mod-muted', text: 'Last updated: ' + (b.updatedAt || 'never') })])
      ]));
      paint();
    }

    async function load() {
      loading(alertHost, 'Aggregating alerts…');
      try {
        var r = await Promise.all([api('GET', 'stats'), api('GET', 'jobs?limit=100'), api('GET', 'current-affairs?limit=100'), api('GET', 'mock-tests?limit=100'), api('GET', 'banner')]);
        var stats = r[0], jobs = r[1].items || [], cas = r[2].items || [], tests = r[3].items || [], now = Date.now();
        alerts = [];
        jobs.forEach(function (j) {
          if (j.status !== 'published' || !j.last_date) return;
          var left = Date.parse(j.last_date + 'T23:59:59+05:30') - now;
          if (left > 0 && left < 72 * 3600000) alerts.push({ id: 'exp-' + j.id, sev: left < 24 * 3600000 ? 'Critical' : 'Warning', msg: 'Job closing ' + j.last_date + ': ' + j.title,
            actions: [btn('Extend +7d', async function () { try { var f = await api('GET', 'jobs/' + encodeURIComponent(j.id)); f.last_date = new Date(Date.parse(f.last_date) + 7 * 86400000).toISOString().slice(0, 10); await api('PUT', 'jobs/' + encodeURIComponent(j.id), f); toast('Extended', 'success'); load(); } catch (e) { toast(e.message, 'crimson'); } }, true), btn('Edit', function () { goTo(MOD_FOLDER.jobs); })] });
        });
        jobs.concat(cas).forEach(function (x) { if (x.status === 'draft') { var k = x.type === 'job' ? 'jobs' : 'current-affairs'; alerts.push({ id: 'draft-' + x.id, sev: 'Info', msg: 'Draft awaiting review (' + (k === 'jobs' ? 'Job' : 'Current Affairs') + '): ' + x.title, actions: [btn('Review', function () { window.selectModule('folder-01', 'module-01-006'); }, true), btn('Edit', function () { goTo(MOD_FOLDER[k]); })] }); } });
        tests.forEach(function (t) { if (!t.question_count) alerts.push({ id: 'noq-' + t.id, sev: t.status === 'published' ? 'Critical' : 'Warning', msg: 'Mock test has 0 questions (' + t.status + '): ' + t.title, actions: [btn('Add Questions', function () { goTo(MOD_FOLDER['mock-tests']); }, true)] }); });
        if (stats.open_incidents) alerts.push({ id: 'incidents', sev: 'Critical', msg: stats.open_incidents + ' open incident(s) unresolved', actions: [btn('Open Incidents', function () { window.selectModule('folder-16', 'module-16-013'); }, true)] });
        var cron = stats.last_cron_run, ran = cron && (cron.ran_at || cron.at);
        if (!ran) alerts.push({ id: 'cron', sev: 'Warning', msg: 'No cron run recorded yet', actions: [btn('Maintenance', function () { window.selectModule('folder-01', 'module-01-003'); }, true)] });
        else if (Date.now() - Date.parse(String(ran).replace(' ', 'T') + (/Z|\+/.test(String(ran)) ? '' : 'Z')) > 3600000) alerts.push({ id: 'cron-stale', sev: 'Warning', msg: 'Last cron run is over 1 hour old (' + ran + ')', actions: [btn('Maintenance', function () { window.selectModule('folder-01', 'module-01-003'); }, true)] });
        var health = await Promise.all(['/api/health', '/sitemap.xml', '/feed.xml'].map(async function (p) { try { var x = await fetch(p, { cache: 'no-store' }); return [p, x.ok]; } catch (_) { return [p, false]; } }));
        health.forEach(function (h) { if (!h[1]) alerts.push({ id: 'health-' + h[0], sev: 'Critical', msg: 'Health check failed: ' + h[0], actions: [btn('Open Site Status', function () { window.selectModule('folder-01', 'module-01-002'); }, true)] }); });
        if (r[4].active) alerts.push({ id: 'banner-live', sev: 'Info', msg: 'Homepage broadcast is LIVE: ' + r[4].headline, actions: [btn('Edit below', function () { composerHost.scrollIntoView(); })] });
        var order = { Critical: 0, Warning: 1, Info: 2 };
        alerts.sort(function (a, b) { return order[a.sev] - order[b.sev]; });
        draw(); composer(r[4]);
      } catch (e) { fail(alertHost, e); }
    }
    load();
  }

  function renderApprovalQueue(root, actions) {
    addHeaderPill(actions, '● Editorial Review & Approval');
    var shell = el('div', { class: 'cso-mod-shell' }), tableHost = el('div', {}), drawer = el('div', { class: 'cso-mod-card cso-hidden' });
    var all = [], typeF = 'All', statF = 'All', selected = {};
    renderBanner(shell, 'Pending Approvals — Editorial Review Queue', 'All draft and scheduled jobs, current affairs and mock tests from D1.', [
      el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-primary', text: 'Bulk Approve Selected', onclick: bulkApprove }),
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'Refresh', onclick: load })
    ]);
    shell.appendChild(pills(['All', 'Jobs', 'Current Affairs', 'Mock Tests'], function (t) { typeF = t; draw(); }));
    shell.appendChild(pills(['All', 'draft', 'scheduled'], function (s) { statF = s; draw(); }));
    shell.appendChild(tableHost); shell.appendChild(drawer); root.appendChild(shell);

    async function bulkApprove() {
      var ids = Object.keys(selected);
      if (!ids.length) { toast('Select at least one record', 'amber'); return; }
      var ok = 0, bad = [];
      for (var i = 0; i < ids.length; i++) {
        var q = selected[ids[i]];
        try { await api('POST', q.kind + '/' + encodeURIComponent(q.it.id) + '/status', { status: 'published' }); ok++; } catch (e) { bad.push(q.it.title + ': ' + e.message); }
      }
      toast(ok + ' published' + (bad.length ? ', ' + bad.length + ' failed — ' + bad[0] : ''), bad.length ? 'amber' : 'success');
      selected = {}; load();
    }
    async function publishNow(q) { try { await api('POST', q.kind + '/' + encodeURIComponent(q.it.id) + '/status', { status: 'published' }); toast('Published', 'success'); drawer.classList.add('cso-hidden'); load(); } catch (e) { toast(e.message, 'crimson'); } }
    function scheduleBox(q, bar) {
      var inp = el('input', { type: 'datetime-local', class: 'cso-mod-input' });
      bar.appendChild(inp);
      bar.appendChild(el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Schedule', onclick: async function () {
        if (!inp.value) { toast('Pick a future date/time', 'amber'); return; }
        try { await api('POST', q.kind + '/' + encodeURIComponent(q.it.id) + '/status', { status: 'scheduled', published_at: new Date(inp.value).toISOString() }); toast('Scheduled', 'success'); drawer.classList.add('cso-hidden'); load(); } catch (e) { toast(e.message, 'crimson'); }
      } }));
    }
    async function openDrawer(q) {
      clear(drawer); drawer.classList.remove('cso-hidden');
      drawer.appendChild(el('h3', { text: 'Candidate Preview — ' + q.it.title }));
      var left = el('div', { class: 'cso-mod-card' }), right = el('div', { class: 'cso-live-preview-box' });
      drawer.appendChild(el('div', { class: 'cso-mod-grid-2' }, [left, right]));
      try {
        if (q.kind === 'mock-tests') {
          var qs = (await api('GET', 'mock-tests/' + encodeURIComponent(q.it.id) + '/questions')).items || [];
          left.appendChild(el('p', { class: 'cso-mod-muted', text: q.it.target_exam + ' · ' + q.it.duration_minutes + ' min · ' + qs.length + ' questions' }));
          right.appendChild(el('h4', { text: q.it.title }));
          if (!qs.length) right.appendChild(el('p', { class: 'cso-mod-badge cso-mod-badge-err', text: 'No questions — cannot be published' }));
          qs.forEach(function (x, i) {
            left.appendChild(el('p', { class: 'cso-mod-muted', text: 'Q' + (i + 1) + ' correct: ' + x.correct_option + (x.explanation ? ' — ' + x.explanation : '') }));
            right.appendChild(el('p', {}, [el('strong', { text: (i + 1) + '. ' + x.question_en })]));
            ['a', 'b', 'c', 'd'].forEach(function (o) { right.appendChild(el('div', { class: 'cso-mod-muted', text: o.toUpperCase() + ') ' + x['option_' + o] })); });
          });
        } else {
          var full = await api('GET', q.kind + '/' + encodeURIComponent(q.it.id));
          left.appendChild(el('pre', { class: 'cso-code-pre', text: JSON.stringify(full, null, 2) }));
          var pr = await api('POST', 'preview', { markdown: full.body_md || '' });
          right.appendChild(el('h4', { text: full.title }));
          var body = el('div', {}); right.appendChild(body); renderSanitizedHtml(body, pr.html || '');
        }
      } catch (e) { right.appendChild(el('p', { class: 'cso-mod-badge cso-mod-badge-err', text: e.message })); }
      var bar = el('div', { class: 'cso-mod-toolbar' }, [
        el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-primary', text: 'Approve & Publish Now', onclick: function () { publishNow(q); } }),
        el('button', { type: 'button', class: 'cso-mod-btn', text: 'Edit in Studio', onclick: function () { goTo(MOD_FOLDER[q.kind]); } }),
        el('button', { type: 'button', class: 'cso-mod-btn', text: 'Close', onclick: function () { drawer.classList.add('cso-hidden'); } })
      ]);
      scheduleBox(q, bar); drawer.appendChild(bar);
    }
    function draw() {
      var names = { jobs: 'Jobs', 'current-affairs': 'Current Affairs', 'mock-tests': 'Mock Tests' };
      var shown = all.filter(function (q) { return (typeF === 'All' || names[q.kind] === typeF) && (statF === 'All' || q.it.status === statF); });
      var rows = shown.map(function (q) {
        return el('tr', {}, [
          el('td', {}, el('input', { type: 'checkbox', checked: selected[q.it.id] ? true : false, onchange: function (e) { if (e.target.checked) selected[q.it.id] = q; else delete selected[q.it.id]; } })),
          el('td', {}, badge(names[q.kind], 'info')), el('td', { text: q.it.title }),
          el('td', {}, badge(q.it.status, q.it.status === 'scheduled' ? 'warn' : 'info')),
          el('td', { text: q.it.published_at || q.it.updated_at || '—' }),
          el('td', {}, el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Preview & Review', onclick: function () { openDrawer(q); } }))
        ]);
      });
      clear(tableHost); tableHost.appendChild(el('p', { class: 'cso-mod-muted', text: shown.length + ' records awaiting review' })); tableHost.appendChild(safeTable(['Select', 'Type', 'Title', 'Status', 'Date', 'Review'], rows));
    }
    async function load() {
      loading(tableHost, 'Loading review queue…');
      try {
        var r = await Promise.all([api('GET', 'jobs?limit=100'), api('GET', 'current-affairs?limit=100'), api('GET', 'mock-tests?limit=100')]);
        all = [];
        [['jobs', r[0]], ['current-affairs', r[1]], ['mock-tests', r[2]]].forEach(function (p) { (p[1].items || []).forEach(function (it) { if (it.status === 'draft' || it.status === 'scheduled') all.push({ kind: p[0], it: it }); }); });
        draw();
      } catch (e) { fail(tableHost, e); }
    }
    load();
  }

  function renderAnalyticsStudio(root, actions) {
    addHeaderPill(actions, '● D1 Content, CBT & SEO Analytics');
    var shell = el('div', { class: 'cso-mod-shell' }), host = el('div', { class: 'cso-mod-shell' });
    var data = null, catSel = el('select', { class: 'cso-mod-select' }), statSel = el('select', { class: 'cso-mod-select' });
    ['All statuses', 'published', 'draft', 'scheduled', 'expired', 'archived'].forEach(function (s) { statSel.appendChild(el('option', { value: s, text: s })); });
    renderBanner(shell, 'Website Analytics Studio', 'Live D1 pipeline, coverage, CBT performance and manifest SEO readiness.', [
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'Export JSON', onclick: function () { if (data) downloadFile('cso-analytics-' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify(report(), null, 2)); } }),
      el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-primary', text: 'Export CSV', onclick: exportCsv })
    ]);
    shell.appendChild(el('div', { class: 'cso-mod-grid-2' }, [el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Category / Exam' }), catSel]), el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Status' }), statSel])]));
    shell.appendChild(host); root.appendChild(shell);
    catSel.addEventListener('change', draw); statSel.addEventListener('change', draw);

    function items() {
      var out = [];
      data.jobs.forEach(function (x) { out.push({ t: 'Job', cat: x.category || 'Uncategorized', status: x.status }); });
      data.cas.forEach(function (x) { out.push({ t: 'Current Affairs', cat: x.category || 'Uncategorized', status: x.status }); });
      data.tests.forEach(function (x) { out.push({ t: 'Mock Test', cat: x.target_exam || 'Uncategorized', status: x.status }); });
      return out;
    }
    function filtered() { return items().filter(function (i) { return (catSel.value === 'All categories' || i.cat === catSel.value) && (statSel.value === 'All statuses' || i.status === statSel.value); }); }
    function seoRows() {
      return data.pages.map(function (p) {
        var tl = (p.title || '').length, dl = (p.description || '').length, issues = [];
        if (tl < 20 || tl > 70) issues.push('title ' + tl + ' chars');
        if (dl < 70 || dl > 170) issues.push('description ' + dl + ' chars');
        return { route: p.route, category: p.category, issues: issues };
      });
    }
    function cbtRows() {
      return data.board.map(function (b) { var it = b.items; var acc = it.length ? it.reduce(function (s, x) { return s + (Number(x.accuracy) || 0); }, 0) / it.length : 0; return { title: b.test.title, participants: it.length, avgAcc: Math.round(acc * 10) / 10, top: it[0] ? it[0].score + '/' + (it[0].maxScore || it[0].max_score) : '—' }; }).filter(function (r) { return r.participants; }).sort(function (a, b) { return b.avgAcc - a.avgAcc; });
    }
    function report() { return { generated_at: new Date().toISOString(), stats: data.stats, pipeline: tally(function (i) { return i.status; }), coverage: tally(function (i) { return i.cat; }), cbt: cbtRows(), seo: seoRows() }; }
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
    function draw() {
      clear(host);
      var s = data.stats;
      host.appendChild(el('div', { class: 'cso-mod-grid-4' }, [kpiBox(String(s.attempts_total || 0), 'CBT Attempts'), kpiBox(String(s.bookmarks_total || 0), 'Bookmarks'), kpiBox(String(s.accounts ? s.accounts.total : 0), 'Registered Users'), kpiBox(String(s.audit_24h || 0), 'Audit events 24h')]));
      var pipe = tally(function (i) { return i.status; });
      host.appendChild(el('div', { class: 'cso-mod-grid-2' }, [
        chartCard('Content Status Pipeline', barChart(Object.keys(pipe).map(function (k) { return { label: k, value: pipe[k], cls: k === 'published' ? 'cso-bar-ok' : k === 'draft' ? 'cso-bar-warn' : 'cso-bar-info' }; }), 'Content status pipeline')),
        chartCard('Exam Category Coverage', barChart((function () { var c = tally(function (i) { return i.cat; }); return Object.keys(c).sort(function (a, b) { return c[b] - c[a]; }).slice(0, 12).map(function (k) { return { label: k, value: c[k] }; }); })(), 'Exam category coverage'))
      ]));
      var cbt = cbtRows(), seo = seoRows();
      var ready = seo.filter(function (r) { return !r.issues.length; }).length;
      host.appendChild(el('div', { class: 'cso-mod-grid-2' }, [
        chartCard('CBT Attempts & Average Accuracy (top-10 best attempts per test)', barChart(cbt.slice(0, 10).map(function (r) { return { label: r.title, value: r.avgAcc, text: r.avgAcc + '% · ' + r.participants + ' users', cls: 'cso-bar-info' }; }), 'CBT breakdown')),
        chartCard('Site Page SEO Readiness (' + seo.length + ' manifest pages)', barChart([{ label: 'Ready', value: ready, cls: 'cso-bar-ok' }, { label: 'Needs title/description fix', value: seo.length - ready, cls: 'cso-bar-warn' }], 'SEO readiness'))
      ]));
      host.appendChild(chartCard('Top-Performing Mock Tests Leaderboard', safeTable(['Rank', 'Mock Test', 'Participants', 'Avg accuracy', 'Top score'], cbt.map(function (r, i) { return el('tr', {}, [el('td', { text: String(i + 1) }), el('td', { text: r.title }), el('td', { text: String(r.participants) }), el('td', { text: r.avgAcc + '%' }), el('td', { text: r.top })]); }))));
      host.appendChild(chartCard('SEO Issues', safeTable(['Route', 'Category', 'Issues'], seo.filter(function (r) { return r.issues.length; }).slice(0, 25).map(function (r) { return el('tr', {}, [el('td', { text: r.route }), el('td', { text: r.category || '—' }), el('td', {}, badge(r.issues.join(', '), 'warn'))]); }))));
    }
    (async function () {
      loading(host, 'Loading analytics…');
      try {
        var r = await Promise.all([api('GET', 'stats'), api('GET', 'jobs?limit=100'), api('GET', 'current-affairs?limit=100'), api('GET', 'mock-tests?limit=100'), fetchManifest()]);
        var tests = r[3].items || [];
        var pub = tests.filter(function (t) { return t.status === 'published'; }).slice(0, 20);
        var board = await Promise.all(pub.map(async function (t) { try { var lb = await (await fetch('/api/content/mock-tests/' + encodeURIComponent(t.slug || t.id) + '/leaderboard', { credentials: 'same-origin' })).json(); return { test: t, items: lb.items || [] }; } catch (_) { return { test: t, items: [] }; } }));
        data = { stats: r[0], jobs: r[1].items || [], cas: r[2].items || [], tests: tests, pages: r[4].pages || [], board: board };
        var cats = {}; items().forEach(function (i) { cats[i.cat] = 1; });
        catSel.appendChild(el('option', { value: 'All categories', text: 'All categories' }));
        Object.keys(cats).sort().forEach(function (c) { catSel.appendChild(el('option', { value: c, text: c })); });
        draw();
      } catch (e) { fail(host, e); }
    })();
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

  function renderCommandDirectory(root, actions) {
    addHeaderPill(actions, '● Command Directory & Capability Matrix');
    var shell = el('div', { class: 'cso-mod-shell' }), tableHost = el('div', {});
    var search = el('input', { type: 'text', class: 'cso-mod-input', placeholder: 'Search module id, title or endpoint…' });
    var folderSel = el('select', { class: 'cso-mod-select' }, [el('option', { value: '', text: 'All folders' })]);
    var rows = [];
    renderBanner(shell, 'Master Feature Registry', 'Every folder and module from master-navigation.json with capability badges and endpoint mapping.');
    shell.appendChild(el('div', { class: 'cso-mod-grid-2' }, [search, folderSel]));
    shell.appendChild(tableHost); root.appendChild(shell);
    function draw() {
      var q = search.value.toLowerCase().trim(), f = folderSel.value;
      var shown = rows.filter(function (r) { return (!f || r.folderId === f) && (!q || (r.id + ' ' + r.title + ' ' + r.folderTitle + ' ' + r.eps.join(' ')).toLowerCase().indexOf(q) >= 0); });
      clear(tableHost);
      tableHost.appendChild(el('p', { class: 'cso-mod-muted', text: shown.length + ' of ' + rows.length + ' modules shown' }));
      tableHost.appendChild(safeTable(['Module', 'Folder', 'Capabilities', 'API / Data endpoints', 'Launch'], shown.slice(0, 150).map(function (r) {
        return el('tr', {}, [el('td', {}, [el('strong', { text: r.title }), el('div', { class: 'cso-mod-muted', text: r.id })]), el('td', { text: r.folderTitle }),
          el('td', {}, el('div', { class: 'cso-mod-toolbar' }, r.caps.map(function (c) { return badge(c, 'ok'); }))),
          el('td', { class: 'cso-mod-muted', text: r.eps.join('  ') }),
          el('td', {}, el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm cso-mod-btn-primary', text: 'Launch Module →', onclick: function () { goTo([r.folderId, r.id]); } }))]);
      })));
      if (shown.length > 150) tableHost.appendChild(el('p', { class: 'cso-mod-muted', text: 'Refine search to see the remaining ' + (shown.length - 150) + ' modules.' }));
    }
    fetchNav().then(function (nav) {
      (nav.folders || []).forEach(function (fo) {
        folderSel.appendChild(el('option', { value: fo.id, text: fo.title + ' (' + fo.modules.length + ')' }));
        fo.modules.forEach(function (m) {
          var route = window.CSOLive && window.CSOLive.routes && window.CSOLive.routes[m.id];
          var eps = (DIR_EP[fo.id] || []).slice();
          if (route && window.CSOLive.resolveRoute) {
            var map = { 'current-affairs': '/api/admin/current-affairs', jobs: '/api/admin/jobs', 'mock-tests': '/api/admin/mock-tests', syllabus: '/api/admin/resources', pyq: '/api/admin/resources', media: '/api/admin/media', users: '/api/admin/users', banner: '/api/admin/banner', audit: '/api/admin/audit', 'audit/security': '/api/admin/audit', incidents: '/api/admin/incidents', operations: '/api/admin/maintenance', dashboard: '/api/admin/stats' };
            var ep = map[window.CSOLive.resolveRoute(fo.id, m.id)[0]]; if (ep && eps.indexOf(ep) < 0) eps.push(ep);
          }
          rows.push({ folderId: fo.id, folderTitle: fo.title, id: m.id, title: m.title, eps: eps.length ? eps : ['(client-side studio)'], caps: dirCaps(fo.id, eps) });
        });
      });
      root.querySelector('.cso-mod-banner-sub').textContent = (nav.folders || []).length + ' folders · ' + rows.length + ' modules (from master-navigation.json) with capability badges and endpoint mapping.';
      draw();
    }).catch(function (e) { fail(tableHost, e); });
    search.addEventListener('input', draw); folderSel.addEventListener('change', draw);
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
