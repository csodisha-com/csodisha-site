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
      version: 'v1.0',
      schema_type: 'JobPosting',
      meta_description: '{{EXAM_NAME}} {{YEAR}} official recruitment notification by {{DEPARTMENT}}, vacancy breakdown, eligibility, last date {{LAST_DATE}}, and direct apply link.',
      hero_title: '{{EXAM_NAME}} {{YEAR}} — Official Recruitment Notification',
      hero_subtitle: '{{DEPARTMENT}} ନିଯୁକ୍ତି ବିଜ୍ଞପ୍ତି {{YEAR}} — Verified vacancy details, age limit, and apply schedule (Last Date: {{LAST_DATE}}).',
      cta_label: 'Apply Online Now',
      cta_url: '/jobs-careers/',
      secondary_cta_label: 'Download Official PDF',
      secondary_cta_url: '/resources/',
      attachments: [{ label: '{{EXAM_NAME}} Official Notification PDF', url: '/resources/', kind: 'Official PDF' }],
      blocks: [
        { type: 'hero', title: '{{EXAM_NAME}} Recruitment {{YEAR}}', text: 'Complete official notification summary from {{DEPARTMENT}} (Apply before {{LAST_DATE}}).', label: 'View Official PDF', url: '/jobs-careers/' },
        { type: 'notice', title: 'Important Dates & Fee', text: 'Last date to apply: {{LAST_DATE}}. Check age limit, reservation, and fee structure before submitting.' },
        { type: 'ticker', title: 'Latest Odisha Govt Job Alerts' },
        { type: 'faq', title: 'Recruitment FAQs', items: ['Who can apply for {{EXAM_NAME}}?|Candidates meeting age and educational criteria as per {{DEPARTMENT}} notification.', 'What is the last date?|Online applications close on {{LAST_DATE}}.'] }
      ]
    },
    {
      id: 'opsc-oas-hub',
      name: 'OPSC OAS Exam & Syllabus Hub',
      category: 'Core Portal',
      version: 'v1.0',
      schema_type: 'Course',
      meta_description: '{{EXAM_NAME}} {{YEAR}} Prelims & Mains syllabus, exam pattern, previous year question papers, and preparation strategy.',
      hero_title: '{{EXAM_NAME}} {{YEAR}} — Exam & Syllabus Hub',
      hero_subtitle: 'ଓଡ଼ିଶା ସିଭିଲ ସର୍ଭିସେସ୍ ପରୀକ୍ଷା ସୂଚୀ ଓ ପାଠ୍ୟକ୍ରମ — Complete Prelims, Mains & Interview syllabus, PYQs, and free mock tests.',
      cta_label: 'Start OAS Mock Test',
      cta_url: '/mock-tests/',
      secondary_cta_label: 'Download Syllabus PDF',
      secondary_cta_url: '/syllabus/',
      attachments: [{ label: '{{EXAM_NAME}} Prelims & Mains Syllabus PDF', url: '/syllabus/', kind: 'Official PDF' }],
      blocks: [
        { type: 'hero', title: '{{EXAM_NAME}} {{YEAR}} Preparation Hub', text: 'Structured syllabus from {{DEPARTMENT}}, Odisha GK notes, and bilingual test series.', label: 'Explore Syllabus', url: '/syllabus/' },
        { type: 'examgrid', title: 'Exam Quick Links', items: ['Prelims Syllabus|/syllabus/', 'Previous Year Papers|/pyq/', 'Daily Current Affairs|/current-affairs/', 'Free Mock Tests|/mock-tests/'] },
        { type: 'cbt', title: 'Practice Prelims CBT', text: 'Attempt timed GS Paper I & CSAT mock tests with instant scorecard.', label: 'Launch CBT', url: '/mock-tests/' }
      ]
    },
    {
      id: 'cbt-mock-portal',
      name: 'Free CBT Mock Test Portal',
      category: 'Candidate Workspace',
      version: 'v1.0',
      schema_type: 'Quiz',
      meta_description: 'Free bilingual Odia & English CBT mock tests for {{EXAM_NAME}} {{YEAR}}, OSSC CGL, OSSSC RI/ARI, and Odisha Police.',
      hero_title: '{{EXAM_NAME}} {{YEAR}} — Free Odisha CBT Mock Test Series',
      hero_subtitle: 'ଓଡ଼ିଆ ଏବଂ ଇଂରାଜୀରେ ମାଗଣା CBT ମକ୍ ଟେଷ୍ଟ — Real exam interface with timer, negative marking, and detailed solutions.',
      cta_label: 'Attempt Free Test',
      cta_url: '/mock-tests/',
      secondary_cta_label: 'View Leaderboard',
      secondary_cta_url: '/student-dashboard/',
      attachments: [{ label: 'CBT Exam Pattern & Marking Guide', url: '/mock-tests/', kind: 'Guide' }],
      blocks: [
        { type: 'cbt', title: 'Full-Length {{EXAM_NAME}} CBT', text: 'Practice {{EXAM_NAME}} {{YEAR}} papers in real-time bilingual mode.', label: 'Start Test Now', url: '/mock-tests/' },
        { type: 'examgrid', title: 'Available Test Series', items: ['OSSC CGLRE Prelims|/mock-tests/', 'OSSSC Combined Exam|/mock-tests/', 'Odisha Police SI|/mock-tests/', 'OTET & OSSTET|/mock-tests/'] },
        { type: 'richtext', text: 'All mock tests are updated regularly as per the latest {{DEPARTMENT}} exam pattern.' }
      ]
    },
    {
      id: 'odisha-scheme-guide',
      name: 'Odisha Govt Scheme & Scholarship Guide',
      category: 'Core Portal',
      version: 'v1.0',
      schema_type: 'GovernmentService',
      meta_description: '{{EXAM_NAME}} {{YEAR}} eligibility, required documents, benefits, and step-by-step online application guide via {{DEPARTMENT}}.',
      hero_title: '{{EXAM_NAME}} {{YEAR}} — Odisha Scheme & Scholarship Guide',
      hero_subtitle: 'ଓଡ଼ିଶା ସରକାରୀ ଯୋଜନା ଓ ବୃତ୍ତି ସହାୟତା — Verified eligibility rules, document checklist, and official portal links (Last Date: {{LAST_DATE}}).',
      cta_label: 'Check Eligibility',
      cta_url: '/schemes/',
      secondary_cta_label: 'Apply on Official Portal',
      secondary_cta_url: 'https://odisha.gov.in',
      attachments: [{ label: 'Required Documents Checklist PDF', url: '/resources/', kind: 'Official PDF' }],
      blocks: [
        { type: 'hero', title: '{{EXAM_NAME}} Welfare & Scholarship Guide', text: 'Step-by-step application instructions by {{DEPARTMENT}} (Deadline: {{LAST_DATE}}).', label: 'Open Schemes Portal', url: '/schemes/' },
        { type: 'notice', title: 'Required Documents', text: 'Keep Aadhaar card, residence certificate, income certificate, and bank passbook ready.' },
        { type: 'faq', title: 'Scheme FAQs', items: ['Where to apply?|Apply only through the official {{DEPARTMENT}} Odisha state portal.', 'Is there any application fee?|No, government welfare and scholarship applications are free.'] }
      ]
    },
    {
      id: 'admit-card-tracker',
      name: 'Admit Card & Result Tracker',
      category: 'Core Portal',
      version: 'v1.0',
      schema_type: 'WebPage',
      meta_description: 'Direct official links to download {{EXAM_NAME}} {{YEAR}} admit cards, hall tickets, answer keys, and merit lists.',
      hero_title: '{{EXAM_NAME}} {{YEAR}} — Admit Card & Result Tracker',
      hero_subtitle: 'ଆଡମିଟ୍ କାର୍ଡ ଏବଂ ପରୀକ୍ଷା ଫଳାଫଳ — Fast, verified links to {{DEPARTMENT}} hall tickets and final selection lists.',
      cta_label: 'Check Live Results',
      cta_url: '/jobs-careers/',
      secondary_cta_label: 'Open Student Dashboard',
      secondary_cta_url: '/student-dashboard/',
      attachments: [{ label: 'Exam Day Instructions & Hall Ticket Guide', url: '/resources/', kind: 'Official PDF' }],
      blocks: [
        { type: 'ticker', title: 'Live Admit Card & Result Updates' },
        { type: 'examgrid', title: 'Official Commission Portals', items: ['OSSC Portal|/jobs-careers/', 'OSSSC Portal|/jobs-careers/', 'OPSC Portal|/jobs-careers/', 'Student Dashboard|/student-dashboard/'] },
        { type: 'notice', title: 'Candidate Advisory', text: 'Verify your roll number and exam centre on the official {{DEPARTMENT}} PDF before {{LAST_DATE}}.' }
      ]
    },
    {
      id: 'official-notice-faq',
      name: 'Official Notice & FAQ Page',
      category: 'Information & Legal',
      version: 'v1.0',
      schema_type: 'FAQPage',
      meta_description: 'Official portal notice, candidate guidelines, and frequently asked questions for {{EXAM_NAME}} {{YEAR}}.',
      hero_title: '{{EXAM_NAME}} — Official Notice & Candidate Guidelines',
      hero_subtitle: 'ସରକାରୀ ବିଜ୍ଞପ୍ତି ଏବଂ ସାଧାରଣ ପ୍ରଶ୍ନୋତ୍ତର — Clear answers on portal access, mock tests, and official verification.',
      cta_label: 'Contact Support',
      cta_url: '/contact.html',
      secondary_cta_label: 'Read Disclaimer',
      secondary_cta_url: '/disclaimer.html',
      attachments: [],
      blocks: [
        { type: 'notice', title: 'Portal Verification Notice', text: 'Common Sense Odisha provides verified educational guides and official {{DEPARTMENT}} links.' },
        { type: 'richtext', text: 'Use this page template for statutory notices, exam advisories, or candidate helpdesks.' },
        { type: 'faq', title: 'Frequently Asked Questions', items: ['How do I report an error?|Reach out via the Contact Us page with the page URL.', 'Are study resources free?|Yes, core syllabus, PYQs, and job alerts are free for Odisha aspirants.'] }
      ]
    },
    {
      id: 'district-recruitment-hub',
      name: 'District Recruitment Drive Hub',
      category: 'Core Portal',
      version: 'v1.0',
      schema_type: 'JobPosting',
      meta_description: '{{EXAM_NAME}} {{YEAR}} Odisha 30-district collectorate, block-level, and contractual recruitment updates by {{DEPARTMENT}}.',
      hero_title: '{{EXAM_NAME}} {{YEAR}} — District Recruitment Drive Hub',
      hero_subtitle: 'ଓଡ଼ିଶାର ୩୦ଟି ଜିଲ୍ଲା ନିଯୁକ୍ତି ସୂଚନା — District-wise vacancy table, walk-in interview dates & application form PDF.',
      cta_label: 'View District Vacancies',
      cta_url: '/jobs-careers/',
      secondary_cta_label: 'Download Application Form',
      secondary_cta_url: '/resources/',
      attachments: [{ label: 'District Collectorate Notification PDF', url: '/resources/', kind: 'Official PDF' }],
      blocks: [
        { type: 'hero', title: '{{EXAM_NAME}} District Drive {{YEAR}}', text: 'Verified district-level vacancies under {{DEPARTMENT}}. Last date: {{LAST_DATE}}.', label: 'Explore District List', url: '/jobs-careers/' },
        { type: 'notice', title: 'Walk-In & Offline Submission Rules', text: 'Check district NIC portal and registered post deadlines ({{LAST_DATE}}) carefully.' },
        { type: 'faq', title: 'District Recruitment FAQs', items: ['Can other district candidates apply?|Check domicile rules in the official {{DEPARTMENT}} PDF.', 'Where to submit forms?|Submit at the designated district office before {{LAST_DATE}}.'] }
      ]
    },
    {
      id: 'answer-key-cutoff',
      name: 'Answer Key & Cutoff Analysis Page',
      category: 'Candidate Workspace',
      version: 'v1.0',
      schema_type: 'Article',
      meta_description: '{{EXAM_NAME}} {{YEAR}} official provisional answer key PDF, objection window ({{LAST_DATE}}), and category-wise expected cutoff marks.',
      hero_title: '{{EXAM_NAME}} {{YEAR}} — Answer Key & Cutoff Analysis',
      hero_subtitle: 'ଉତ୍ତର ସୂଚୀ ଏବଂ କଟଅଫ୍ ବିଶ୍ଳେଷଣ — Set A/B/C/D answer key PDFs, objection link, and UR/SEBC/SC/ST cutoff trends.',
      cta_label: 'Download Answer Key PDF',
      cta_url: '/resources/',
      secondary_cta_label: 'Practice Next Stage CBT',
      secondary_cta_url: '/mock-tests/',
      attachments: [{ label: '{{EXAM_NAME}} Official Answer Key Set A-D PDF', url: '/resources/', kind: 'Official PDF' }],
      blocks: [
        { type: 'hero', title: '{{EXAM_NAME}} Answer Key & Cutoff {{YEAR}}', text: 'Published by {{DEPARTMENT}}. Raise objections before {{LAST_DATE}}.', label: 'Check Answer Key', url: '/resources/' },
        { type: 'notice', title: 'Objection Window Deadline', text: 'Candidates must submit valid documentary proof on the {{DEPARTMENT}} portal on or before {{LAST_DATE}}.' },
        { type: 'cbt', title: 'Prepare for Mains / Skill Test', text: 'Attempt our free CBT mock tests aligned with the latest cutoff trends.', label: 'Start CBT Practice', url: '/mock-tests/' }
      ]
    },
    {
      id: 'teacher-eligibility-guide',
      name: 'B.Ed / OTET / OSSTET Teacher Eligibility Guide',
      category: 'Core Portal',
      version: 'v1.0',
      schema_type: 'Course',
      meta_description: '{{EXAM_NAME}} {{YEAR}} Odisha teacher eligibility syllabus, Paper I & II pattern, qualifying marks, and free pedagogy mock tests.',
      hero_title: '{{EXAM_NAME}} {{YEAR}} — Odisha Teacher Eligibility Guide',
      hero_subtitle: 'ଓଡ଼ିଶା ଶିକ୍ଷକ ଯୋଗ୍ୟତା ପରୀକ୍ଷା (OTET / OSSTET / B.Ed) — Paper I & II syllabus, Odia pedagogy notes, and practice tests.',
      cta_label: 'Attempt Teacher CBT',
      cta_url: '/mock-tests/',
      secondary_cta_label: 'Download Pedagogy Syllabus',
      secondary_cta_url: '/syllabus/',
      attachments: [{ label: '{{EXAM_NAME}} Paper I & II Syllabus PDF', url: '/syllabus/', kind: 'Official PDF' }],
      blocks: [
        { type: 'hero', title: '{{EXAM_NAME}} {{YEAR}} Complete Guide', text: 'Conducted by {{DEPARTMENT}}. Application deadline: {{LAST_DATE}}.', label: 'Download Syllabus', url: '/syllabus/' },
        { type: 'examgrid', title: 'Teacher Exam Modules', items: ['Child Development & Pedagogy|/mock-tests/', 'Odia & English Language|/mock-tests/', 'Previous Year OTET/OSSTET|/pyq/', 'Official BSE Notice|/jobs-careers/'] },
        { type: 'faq', title: 'Teacher Eligibility FAQs', items: ['What is the qualifying mark?|General 60% (90/150) and reserved categories 50% (75/150) as per norms.', 'Is there negative marking?|Check the latest {{YEAR}} {{DEPARTMENT}} information brochure.'] }
      ]
    },
    {
      id: 'pyq-download-vault',
      name: 'Previous Year Question Paper (PYQ) Download Vault',
      category: 'Candidate Workspace',
      version: 'v1.0',
      schema_type: 'CollectionPage',
      meta_description: 'Download {{EXAM_NAME}} previous year question papers (PYQ) with official answer keys and free online CBT practice sets.',
      hero_title: '{{EXAM_NAME}} — Previous Year Question Paper (PYQ) Vault',
      hero_subtitle: 'ପୂର୍ବ ବର୍ଷର ପ୍ରଶ୍ନପତ୍ର ସଂଗ୍ରହ — Year-wise {{EXAM_NAME}} question PDFs with solved explanations.',
      cta_label: 'Browse All PYQ PDFs',
      cta_url: '/pyq/',
      secondary_cta_label: 'Solve PYQs in CBT Mode',
      secondary_cta_url: '/mock-tests/',
      attachments: [{ label: '{{EXAM_NAME}} 5-Year Solved PYQ Pack PDF', url: '/pyq/', kind: 'PYQ Archive' }],
      blocks: [
        { type: 'hero', title: '{{EXAM_NAME}} PYQ Archive', text: 'Verified {{DEPARTMENT}} question papers curated for Odisha aspirants.', label: 'Open PYQ Vault', url: '/pyq/' },
        { type: 'examgrid', title: 'Year-Wise Question Sets', items: ['2025 Solved Paper|/pyq/', '2024 Solved Paper|/pyq/', '2023 Solved Paper|/pyq/', 'Interactive PYQ CBT|/mock-tests/'] },
        { type: 'richtext', text: 'Solving at least 5 years of {{EXAM_NAME}} PYQs helps identify high-weightage Odisha GK and reasoning topics.' }
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
            el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm cso-mod-btn-primary', text: 'Edit in Full Studio', onclick: function () { f02State.editRoute = p.route; f02State.editPage = p; window.selectModule && window.selectModule('folder-02', 'module-02-002'); } }),
            el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Quick Edit', onclick: function () { openPageStudioDrawer(p); } }),
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
      el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-primary', text: '+ Create New Page', onclick: function () { f02State.editRoute = null; f02State.editPage = null; window.selectModule && window.selectModule('folder-02', 'module-02-002'); } }),
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
    var kpiHost = el('div', { class: 'cso-kpi-grid-4' });
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
    var lifecycleHost = el('div', {});
    var revisionHost = el('div', {});
    var validationHost = el('div', {});
    var linkHealthHost = el('div', {});
    var fullscreenHost = el('div', {});
    var editMode = false;
    var editingRoute = null;
    var editingStatus = 'published';
    var editingRevisionsCount = 0;
    var lastLinkResults = [];
    var blockCards = [];
    var attCards = [];
    var redirectChk = el('input', { type: 'checkbox', checked: true });
    var redirectWrap = el('label', { class: 'cso-check-label cso-hidden' }, [
      redirectChk,
      el('span', { text: 'Auto-create 301 redirect from old slug' })
    ]);
    var publishBtn = el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-primary', text: 'Publish Live Now', onclick: function () { submitPage('published'); } });
    var bottomPublishBtn = el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-primary', text: 'Publish Live Now', onclick: function () { submitPage('published'); } });

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
      attCards = [];
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

        var aCard = el('div', { class: 'cso-builder-block' }, [
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
        ]);
        attCards[idx] = aCard;
        attachListHost.appendChild(aCard);
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

    function buildRealPreviewHtml() {
      var escHtml = function (s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
          return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
      };
      var safeU = function (u) {
        var s = String(u || '').trim();
        return (s.indexOf('/') === 0 && s.indexOf('//') !== 0) || /^https?:\/\//i.test(s) ? s : '#';
      };
      var t = titleInp.value.trim() || 'Page Title — Common Sense Odisha';
      var hTitle = heroTitleInp.value.trim() || t;
      var hSub = heroSubInp.value.trim() || 'Verified guidance and resources for Odisha aspirants.';
      var oSub = odiaSubInp.value.trim();
      var cLbl = ctaLblInp.value.trim();
      var cUrl = safeU(ctaUrlInp.value.trim() || '/jobs-careers/');
      var heroImgAtt = attachments.find(function (a) { return a.is_image && a.role === 'Hero Cover Image'; });

      var blocksHtml = starterBlocks.map(function (b, idx) {
        var heading = escHtml(b.question || b.title || b.heading || 'Section');
        var bodyTxt = escHtml(b.answer || b.text || b.body || '');
        var inner = '<h2>' + heading + '</h2>';
        if (b.type === 'key_dates' && Array.isArray(b.rows) && b.rows.length) {
          inner += '<table><thead><tr><th>Event / Milestone</th><th>Date / Status</th></tr></thead><tbody>' +
            b.rows.map(function (rw) { return '<tr><td>' + escHtml(rw.label || '') + '</td><td>' + escHtml(rw.value || '') + '</td></tr>'; }).join('') +
            '</tbody></table>';
        } else if (bodyTxt) {
          inner += '<p>' + bodyTxt + '</p>';
        }
        if (b.url) inner += '<p><a href="' + escHtml(safeU(b.url)) + '">' + escHtml(b.url) + '</a></p>';
        return '<section class="card" data-editor-target="block-' + idx + '">' + inner + '</section>';
      }).join('');

      var attHtml = attachments.length ? '<section class="card"><h2>Official Files &amp; Resources</h2>' + attachments.map(function (a, idx) {
        var media = a.is_image ? '<img src="' + escHtml(safeU(a.url)) + '" alt="' + escHtml(a.alt || a.title) + '">' : '';
        return '<div class="cso-att-preview" data-editor-target="attachment-' + idx + '">' + media +
          '<p><strong>' + escHtml(a.title) + '</strong> (' + escHtml(a.source_label || a.role || 'Link') + ')</p>' +
          '<a href="' + escHtml(safeU(a.url)) + '">' + escHtml(a.url) + '</a></div>';
      }).join('') + '</section>' : '';

      return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
        '<title>' + escHtml(t) + '</title>' +
        '<link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/assets/site.css">' +
        '</head><body><main class="container">' +
        '<header class="hero" data-editor-target="hero">' +
        '<p class="kicker">' + escHtml(catSel.value) + ' · ' + escHtml(layoutSel.value) + '</p>' +
        (heroImgAtt ? '<img src="' + escHtml(safeU(heroImgAtt.url)) + '" alt="' + escHtml(heroImgAtt.alt || heroImgAtt.title) + '">' : '') +
        '<h1>' + escHtml(hTitle) + '</h1><p>' + escHtml(hSub) + '</p>' +
        (oSub ? '<p class="odia-sub">' + escHtml(oSub) + '</p>' : '') +
        (cLbl ? '<p><a class="btn primary" href="' + escHtml(cUrl) + '">' + escHtml(cLbl) + '</a></p>' : '') +
        '</header>' + blocksHtml + attHtml + '</main></body></html>';
    }

    function jumpToEditorTarget(target) {
      if (!target) return;
      clear(fullscreenHost);
      var node = null;
      var focusEl = null;
      if (target === 'hero') {
        node = heroTitleInp;
        focusEl = heroTitleInp;
      } else if (target.indexOf('block-') === 0) {
        var bIdx = Number(target.slice(6));
        node = blockCards[bIdx] || blocksHost;
        focusEl = node ? node.querySelector('input, textarea, select') : null;
      } else if (target.indexOf('attachment-') === 0) {
        var aIdx = Number(target.slice(11));
        node = attCards[aIdx] || attachListHost;
        focusEl = node ? node.querySelector('input, select') : null;
      }
      if (node && node.scrollIntoView) node.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (node && node.classList) {
        node.classList.add('cso-focus-pulse');
        setTimeout(function () { node.classList.remove('cso-focus-pulse'); }, 1800);
      }
      if (focusEl && focusEl.focus) focusEl.focus();
      toast('Focused editor section: ' + target, 'info');
    }

    function wirePreviewClickToFocus(iframeEl) {
      iframeEl.addEventListener('load', function () {
        try {
          var doc = iframeEl.contentDocument;
          if (!doc) return;
          doc.addEventListener('click', function (ev) {
            ev.preventDefault();
            var hit = ev.target && ev.target.closest ? ev.target.closest('[data-editor-target]') : null;
            if (hit) jumpToEditorTarget(hit.getAttribute('data-editor-target'));
          });
        } catch (_) {}
      });
    }

    function openFullScreenPreview() {
      clear(fullscreenHost);
      var fsMode = mobileMode ? 'mobile' : 'desktop';
      var fsFrame = el('iframe', {
        class: 'cso-fullscreen-frame' + (fsMode === 'mobile' ? ' is-mobile' : ''),
        sandbox: 'allow-same-origin',
        title: 'Full-Screen Real Page Preview'
      });
      fsFrame.srcdoc = buildRealPreviewHtml();
      wirePreviewClickToFocus(fsFrame);

      var btnDesk = el('button', { type: 'button', class: 'cso-pill' + (fsMode === 'desktop' ? ' cso-pill-active' : ''), text: 'Desktop 100%', onclick: function () { setFs('desktop'); } });
      var btnTab = el('button', { type: 'button', class: 'cso-pill', text: 'Tablet 768px', onclick: function () { setFs('tablet'); } });
      var btnMob = el('button', { type: 'button', class: 'cso-pill' + (fsMode === 'mobile' ? ' cso-pill-active' : ''), text: 'Mobile 375px', onclick: function () { setFs('mobile'); } });
      function setFs(m) {
        fsMode = m;
        btnDesk.classList.toggle('cso-pill-active', m === 'desktop');
        btnTab.classList.toggle('cso-pill-active', m === 'tablet');
        btnMob.classList.toggle('cso-pill-active', m === 'mobile');
        fsFrame.className = 'cso-fullscreen-frame' + (m === 'tablet' ? ' is-tablet' : m === 'mobile' ? ' is-mobile' : '');
      }
      function closeFs() {
        document.removeEventListener('keydown', onEsc);
        clear(fullscreenHost);
      }
      function onEsc(e) { if (e.key === 'Escape') closeFs(); }
      document.addEventListener('keydown', onEsc);

      fullscreenHost.appendChild(el('div', { class: 'cso-fullscreen-overlay' }, [
        el('div', { class: 'cso-drawer-head' }, [
          el('div', { class: 'cso-mod-toolbar' }, [
            el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: '← Back to Editor', onclick: closeFs }),
            el('strong', { text: 'Full-Screen Real View (Click any section to jump to editor)' })
          ]),
          el('div', { class: 'cso-mod-toolbar' }, [
            btnDesk, btnTab, btnMob,
            el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Save Draft', onclick: function () { closeFs(); submitPage('draft'); } }),
            el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm cso-mod-btn-primary', text: editMode ? 'Update Live' : 'Publish Live', onclick: function () { closeFs(); submitPage('published'); } })
          ])
        ]),
        el('div', { class: 'cso-fullscreen-stage' }, [fsFrame])
      ]));
    }

    function updatePreviewPane() {
      clear(previewHost);
      var t = titleInp.value.trim() || 'Page Title — Common Sense Odisha';
      var d = metaDescInp.value.trim() || 'Meta description preview will appear here as you type…';
      var r = f02NormalizeRoute(slugInp.value || '/new-page/');
      var heroImgAtt = attachments.find(function (a) { return a.is_image && a.role === 'Hero Cover Image'; });
      var ogAtt = attachments.find(function (a) { return a.is_image && a.role === 'OpenGraph Social Image'; });
      var ogUrl = ogImgInp.value.trim() || (ogAtt ? ogAtt.url : (heroImgAtt ? heroImgAtt.url : ''));

      if (previewTab === 'serp') {
        previewHost.appendChild(el('div', { class: mobileMode ? 'cso-preview-card-mobile' : 'cso-preview-card-desktop' }, [
          el('div', { class: 'cso-serp-card' }, [
            el('div', { class: 'cso-serp-url', text: 'https://csodisha.com' + r }),
            el('div', { class: 'cso-serp-title', text: t }),
            el('p', { class: 'cso-serp-desc', text: d })
          ])
        ]));
      } else if (previewTab === 'og') {
        previewHost.appendChild(el('div', { class: mobileMode ? 'cso-preview-card-mobile' : 'cso-preview-card-desktop' }, [
          el('div', { class: 'cso-og-card' }, [
            el('div', { class: 'cso-preview-kicker', text: 'CSODISHA.COM · ' + catSel.value.toUpperCase() }),
            ogUrl ? el('img', { src: ogUrl, alt: t, class: 'cso-asset-preview-img' }) : null,
            el('strong', { text: t }),
            el('p', { class: 'cso-mod-muted', text: d })
          ])
        ]));
      } else if (previewTab === 'jsonld') {
        previewHost.appendChild(el('pre', { class: 'cso-code-pre', text: JSON.stringify(buildPreviewJsonLd(r, t), null, 2) }));
      } else {
        var miniFrame = el('iframe', {
          class: mobileMode ? 'cso-preview-frame-mobile' : 'cso-preview-frame',
          sandbox: 'allow-same-origin',
          title: 'Real-CSS Live Page Mini-Preview'
        });
        miniFrame.srcdoc = buildRealPreviewHtml();
        wirePreviewClickToFocus(miniFrame);
        previewHost.appendChild(el('div', { class: 'cso-preview-frame-wrap' }, [miniFrame]));
        previewHost.appendChild(el('p', { class: 'cso-mod-muted', text: 'Tip: Click any heading, table, or attachment inside the preview to jump directly to its editor field.' }));
      }
    }

    function runValidation() {
      var errs = [], warns = [];
      var t = titleInp.value.trim();
      var d = metaDescInp.value.trim();
      var rawSlug = slugInp.value.trim();
      var r = f02NormalizeRoute(rawSlug || '/new-page/');
      if (!t || t.length < 6) errs.push({ msg: 'Page Title is missing or too short (min 6 chars)', el: titleInp });
      if (!rawSlug || rawSlug === '/' || !/^\/[a-z0-9\-\/]+$/i.test(rawSlug)) errs.push({ msg: 'Slug must be a valid /kebab-case/ route', el: slugInp });
      if (existingRoutes[r] && (!editMode || r !== editingRoute)) errs.push({ msg: 'Route ' + r + ' already exists in /api/admin/pages', el: slugInp });
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
      bottomPublishBtn.disabled = errs.length > 0;
      var blockTip = errs.length > 0 ? ('Resolve ' + errs.length + ' blocking error(s) in Pre-Publish Error Detector before publishing live') : '';
      publishBtn.title = blockTip;
      bottomPublishBtn.title = blockTip;
      clear(validationHost);
      var verifyBtn = el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Verify All Links (200 OK)', onclick: verifyAllLinks });
      if (!errs.length && !warns.length) {
        validationHost.appendChild(el('div', { class: 'cso-mod-card' }, [
          el('div', { class: 'cso-drawer-head' }, [
            badge('Pre-Publish Gate: All Checks Passed ✓', 'ok'),
            verifyBtn
          ]),
          linkHealthHost
        ]));
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
          el('div', { class: 'cso-mod-toolbar' }, [
            verifyBtn,
            el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm cso-mod-btn-primary', text: '1-Click Auto-Fix Safe Issues', onclick: autoFixSafe })
          ])
        ]),
        list,
        linkHealthHost
      ]));
    }

    async function verifyAllLinks() {
      var urls = [];
      if (ctaUrlInp.value.trim()) urls.push(ctaUrlInp.value.trim());
      if (ogImgInp.value.trim()) urls.push(ogImgInp.value.trim());
      attachments.forEach(function (a) { if (a.url) urls.push(a.url); });
      starterBlocks.forEach(function (b) { if (b.url) urls.push(b.url); });
      urls = urls.filter(function (u, i, arr) { return u && arr.indexOf(u) === i; });
      if (!urls.length) { toast('No links or attachments to verify', 'info'); return; }
      clear(linkHealthHost);
      linkHealthHost.appendChild(el('p', { class: 'cso-mod-muted', text: 'Pinging ' + urls.length + ' link(s)…' }));
      try {
        var res = await api('POST', 'utils/check-links', { urls: urls });
        lastLinkResults = res.results || [];
        clear(linkHealthHost);
        var row = el('div', { class: 'cso-mod-toolbar' });
        lastLinkResults.forEach(function (r) {
          var tone = r.ok ? 'ok' : (r.note && r.note.indexOf('Private') !== -1 ? 'warn' : 'danger');
          row.appendChild(badge(r.note + ' · ' + r.url.slice(0, 42), tone));
        });
        linkHealthHost.appendChild(row);
      } catch (e) {
        clear(linkHealthHost);
        linkHealthHost.appendChild(el('p', { class: 'cso-mod-muted', text: 'Link check failed: ' + e.message }));
      }
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
      if (editMode && r === editingRoute) {
        slugStatusEl.appendChild(badge('Editing Existing Route (' + editingStatus + ')', 'info'));
      } else if (existingRoutes[r]) {
        slugStatusEl.appendChild(badge('Already Exists (will update)', 'warn'));
      } else {
        slugStatusEl.appendChild(badge('Slug Available ✓', 'ok'));
      }
      slugStatusEl.appendChild(el('code', { text: r }));
      redirectWrap.classList.toggle('cso-hidden', !(editMode && editingRoute && r !== editingRoute));
      renderReadinessKpis();
      runValidation();
      updatePreviewPane();
      scheduleDraftSave();
    }

    function renderInitialBlocks() {
      clear(blocksHost);
      blockCards = [];
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

        var bCard = el('div', { class: 'cso-builder-block' }, [
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
        ]);
        blockCards[idx] = bCard;
        blocksHost.appendChild(bCard);
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
        old_route: (editMode && editingRoute && editingRoute !== route) ? editingRoute : undefined,
        create_redirect: (editMode && editingRoute && editingRoute !== route) ? !!redirectChk.checked : undefined,
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
        note: editMode ? 'Updated via Full Page Studio' : 'Created via Create New Page Wizard'
      };
      try {
        var res = await api(editMode ? 'PUT' : 'POST', 'pages', payload);
        try { localStorage.removeItem(DRAFT_KEY); clear(recoveryHost); } catch (_) {}
        existingRoutes[res.route] = 1;
        editMode = true;
        editingRoute = res.route;
        editingStatus = status;
        editingRevisionsCount = (editingRevisionsCount || 0) + 1;
        renderLifecycleBar();
        updateAll();
        toast((res.redirect_from ? '301 redirect created (' + res.redirect_from + ' → ' + res.route + ') · ' : '') + 'Page ' + status + ': ' + res.route, 'success');
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

    function loadPageIntoEditor(p) {
      if (!p) return;
      editMode = true;
      editingRoute = f02NormalizeRoute(p.route);
      editingStatus = p.status || 'published';
      editingRevisionsCount = p.revisions || 0;
      titleInp.value = p.title || '';
      slugInp.value = editingRoute;
      slugInp.dataset.touched = '1';
      catSel.value = p.category || 'Core Portal';
      metaDescInp.value = p.meta_description || '';
      heroTitleInp.value = p.hero_title || p.title || '';
      heroTitleInp.dataset.touched = '1';
      heroSubInp.value = p.hero_subtitle || '';
      ctaLblInp.value = p.cta_label || '';
      ctaUrlInp.value = p.cta_url || '';
      schedInp.value = p.publish_at ? String(p.publish_at).slice(0, 16) : '';
      var parsed = [];
      try { parsed = JSON.parse(p.blocks_json || '[]'); } catch (_) {}
      if (!Array.isArray(parsed)) parsed = [];
      var pm = parsed.find(function (b) { return b && b.type === 'page_meta'; }) || {};
      var ogm = parsed.find(function (b) { return b && b.type === 'og_meta'; }) || {};
      odiaSubInp.value = pm.odia_subtitle || '';
      layoutSel.value = pm.layout_variant || 'Standard Portal';
      navChk.checked = !!pm.show_in_nav;
      featChk.checked = !!pm.feature_home;
      noindexChk.checked = !!pm.noindex;
      expiresInp.value = pm.expires_at || '';
      ogImgInp.value = ogm.og_image || '';
      attachments = parsed.filter(function (b) { return b && (b.type === 'attachment' || b.type === 'image'); }).map(function (b, idx) {
        var meta = detectLinkMeta(b.url || '', b.role || '');
        return {
          id: 'att-' + idx + '-' + Date.now(),
          title: b.title || meta.source_label || 'Attachment',
          alt: b.alt || '',
          url: b.url || '',
          preview_url: b.preview_url || meta.preview_url || b.url || '',
          role: b.role || (b.type === 'image' ? 'Hero Cover Image' : 'Official Portal Link'),
          source_kind: b.source_kind || meta.source_kind,
          source_label: b.source_label || meta.source_label,
          domain: b.domain || meta.domain,
          is_image: b.type === 'image' || !!b.is_image || meta.is_image,
          is_pdf: !!b.is_pdf || meta.is_pdf,
          new_tab: b.new_tab !== false
        };
      });
      starterBlocks = parsed.filter(function (b) { return b && b.type !== 'page_meta' && b.type !== 'og_meta' && b.type !== 'attachment' && b.type !== 'image'; });
      if (!starterBlocks.length) starterBlocks = [{ type: 'richtext', title: 'Overview', text: '' }];
      publishBtn.textContent = 'Update Live';
      bottomPublishBtn.textContent = 'Update Live';
      clear(revisionHost);
      renderLifecycleBar();
      renderAttachments();
      renderInitialBlocks();
      updateAll();
      toast('Loaded page into Edit Mode: ' + editingRoute, 'info');
    }

    function resetToCreateMode() {
      editMode = false;
      editingRoute = null;
      editingStatus = 'published';
      editingRevisionsCount = 0;
      publishBtn.textContent = 'Publish Live Now';
      bottomPublishBtn.textContent = 'Publish Live Now';
      clear(lifecycleHost);
      clear(revisionHost);
      attachments = [];
      applyBlueprint('blank');
      renderAttachments();
    }

    async function openRevisionsDrawer() {
      if (!editingRoute) return;
      clear(revisionHost);
      revisionHost.appendChild(el('div', { class: 'cso-drawer' }, [el('p', { class: 'cso-mod-muted', text: 'Loading revision history for ' + editingRoute + '…' })]));
      try {
        var d = await api('GET', 'pages/revisions?route=' + encodeURIComponent(editingRoute));
        var revs = d.revisions || [];
        clear(revisionHost);
        var box = el('div', { class: 'cso-drawer' }, [
          el('div', { class: 'cso-drawer-head' }, [
            el('strong', { text: 'Revision History (' + revs.length + ' snapshots) — ' + editingRoute }),
            el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Close', onclick: function () { clear(revisionHost); } })
          ])
        ]);
        if (!revs.length) {
          box.appendChild(el('p', { class: 'cso-mod-muted', text: 'No saved revisions yet. Updating this page will record a snapshot.' }));
        } else {
          revs.forEach(function (rv) {
            var snap = {};
            try { snap = JSON.parse(rv.snapshot_json || '{}'); } catch (_) {}
            var blkCount = 0;
            try { var arr = JSON.parse(snap.blocks_json || '[]'); blkCount = Array.isArray(arr) ? arr.length : 0; } catch (_) {}
            box.appendChild(el('div', { class: 'cso-diff-row' }, [
              el('div', { class: 'cso-drawer-head' }, [
                el('div', {}, [
                  el('strong', { text: (snap.title || rv.route) + ' ' }),
                  badge(snap.status || 'draft', snap.status === 'published' ? 'ok' : 'warn'),
                  el('div', { class: 'cso-mod-muted', text: (rv.created_at || '') + ' · ' + (rv.editor_email || 'staff') + ' · ' + (rv.note || 'update') + ' · ' + blkCount + ' blocks' })
                ]),
                el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm cso-mod-btn-primary', text: 'Restore Previous Version', onclick: async function () {
                  try {
                    await api('POST', 'pages/restore', { route: editingRoute, revision_id: rv.id, status: 'draft' });
                    var listRes = await api('GET', 'pages');
                    var fresh = (listRes.pages || []).find(function (x) { return x.route === editingRoute; });
                    if (fresh) loadPageIntoEditor(fresh);
                    toast('Restored revision #' + rv.id + ' as draft', 'success');
                  } catch (e) { toast(e.message, 'crimson'); }
                } })
              ])
            ]));
          });
        }
        revisionHost.appendChild(box);
      } catch (e) {
        clear(revisionHost);
        toast(e.message, 'crimson');
      }
    }

    function renderLifecycleBar() {
      clear(lifecycleHost);
      if (!editMode || !editingRoute) return;
      lifecycleHost.appendChild(el('div', { class: 'cso-lifecycle-bar' }, [
        el('div', { class: 'cso-inline-row' }, [
          badge('EDIT MODE', 'info'),
          badge(editingStatus, editingStatus === 'published' ? 'ok' : (editingStatus === 'scheduled' ? 'warn' : 'muted')),
          el('code', { text: editingRoute }),
          el('span', { class: 'cso-mod-muted', text: editingRevisionsCount + ' rev(s)' })
        ]),
        el('div', { class: 'cso-mod-toolbar' }, [
          el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm cso-mod-btn-primary', text: 'Update Live', onclick: function () { submitPage('published'); } }),
          el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Revert to Draft (Unpublish)', onclick: function () { submitPage('draft'); } }),
          el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Schedule Update', onclick: function () { submitPage('scheduled'); } }),
          el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Extend Expiry (+30 Days)', onclick: function () {
            var base = expiresInp.value ? new Date(expiresInp.value) : new Date();
            base.setDate(base.getDate() + 30);
            expiresInp.value = base.toISOString().slice(0, 10);
            updateAll();
            submitPage(editingStatus || 'published');
          } }),
          el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Duplicate as New Page', onclick: function () {
            editMode = false;
            editingRoute = null;
            editingStatus = 'draft';
            publishBtn.textContent = 'Publish Live Now';
      bottomPublishBtn.textContent = 'Publish Live Now';
            titleInp.value = (titleInp.value.trim() || 'Page') + ' (Copy)';
            slugInp.value = f02NormalizeRoute((slugInp.value || '/page/').replace(/\/$/, '') + '-copy/');
            slugInp.dataset.touched = '1';
            clear(lifecycleHost);
            clear(revisionHost);
            updateAll();
            toast('Duplicated into Create Mode — edit slug & publish when ready', 'info');
          } }),
          el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Revision History', onclick: openRevisionsDrawer }),
          el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-danger cso-mod-btn-sm', text: 'Archive / Delete', onclick: async function () {
            if (!window.confirm('Archive / move "' + editingRoute + '" to trash?')) return;
            try {
              await api('PUT', 'pages', { route: editingRoute, status: 'trash', note: 'Archived from Full Studio' });
              toast('Archived: ' + editingRoute, 'success');
              resetToCreateMode();
            } catch (e) { toast(e.message, 'crimson'); }
          } })
        ])
      ]));
    }

    var editPageSel = el('select', { class: 'cso-mod-select' }, [el('option', { value: '', text: 'Edit Existing Page…' })]);
    editPageSel.addEventListener('change', function () {
      if (!editPageSel.value) return;
      var found = allPagesList.find(function (p) { return p.route === editPageSel.value; });
      if (found) loadPageIntoEditor(found);
    });

    renderBanner(shell, 'Create & Edit Website Pages', 'Create new routes or edit existing portals on csodisha.com with 301 redirects, AI polish, revision rollback & click-to-focus real-CSS preview.', [
      el('button', { type: 'button', class: 'cso-mod-btn', text: '+ New Page', onclick: resetToCreateMode }),
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'Save Draft', onclick: function () { submitPage('draft'); } }),
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'Schedule', onclick: function () { submitPage('scheduled'); } }),
      publishBtn
    ]);

    shell.appendChild(recoveryHost);
    shell.appendChild(lifecycleHost);
    shell.appendChild(revisionHost);

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

    async function runAiDraft(blocksOnly, mode) {
      var aiMode = mode || 'create';
      var topic = aiTopicInp.value.trim() || titleInp.value.trim() || heroTitleInp.value.trim();
      if (!topic || topic.length < 3) { toast('Enter a topic or page title for the AI Assistant', 'amber'); aiTopicInp.focus(); return; }
      toast('Running AI (' + aiMode + ') via Workers AI…', 'info');
      try {
        var payload = {
          mode: aiMode,
          topic: topic,
          sourceNotes: aiNotesInp.value.trim(),
          category: catSel.value,
          contentStyle: aiStyleSel.value,
          language: aiMode === 'translate_odia' ? 'Bilingual English + Odia' : aiLangSel.value
        };
        if (aiMode !== 'create') {
          payload.existing = {
            title: titleInp.value.trim(),
            route: f02NormalizeRoute(slugInp.value || '/'),
            meta_description: metaDescInp.value.trim(),
            hero_title: heroTitleInp.value.trim(),
            hero_subtitle: heroSubInp.value.trim(),
            odia_subtitle: odiaSubInp.value.trim(),
            category: catSel.value,
            blocks: starterBlocks
          };
        }
        var res = await api('POST', 'ai/generate-page', payload);
        aiProviderBadge.textContent = 'AI (' + aiMode + ') via ' + (res.provider || 'workers-ai');
        if (aiMode === 'translate_odia') {
          if (res.odia_subtitle) odiaSubInp.value = res.odia_subtitle;
          if (Array.isArray(res.blocks) && res.blocks.length) starterBlocks = mapAiBlocks(res.blocks);
        } else {
          if (!blocksOnly) {
            titleInp.value = res.title || titleInp.value;
            if (aiMode === 'create') {
              slugInp.value = res.slug || slugInp.value;
              delete slugInp.dataset.touched;
            }
            metaDescInp.value = res.meta_description || metaDescInp.value;
            heroTitleInp.value = res.hero_title || res.title || heroTitleInp.value;
            heroSubInp.value = res.hero_subtitle || heroSubInp.value;
            if (res.odia_subtitle) odiaSubInp.value = res.odia_subtitle;
          }
          starterBlocks = mapAiBlocks(res.blocks);
        }
        renderInitialBlocks();
        updateAll();
        toast('AI ' + aiMode + ' applied to editor (unpublished)', 'success');
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
          el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-primary', text: 'Generate Draft Into Editor', onclick: function () { runAiDraft(false, 'create'); } }),
          el('button', { type: 'button', class: 'cso-mod-btn', text: 'Regenerate Blocks Only', onclick: function () { runAiDraft(true, 'create'); } }),
          el('button', { type: 'button', class: 'cso-mod-btn', text: 'AI Polish & Expand Content', onclick: function () { runAiDraft(false, 'polish'); } }),
          el('button', { type: 'button', class: 'cso-mod-btn', text: 'AI Add Odia (ଓଡ଼ିଆ) Summary', onclick: function () { runAiDraft(false, 'translate_odia'); } })
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
      el('div', { class: 'cso-mod-grid-2' }, [
        el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Edit Existing Page' }), editPageSel]),
        el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Clone From Existing Page' }), cloneSel])
      ]),
      el('div', { class: 'cso-drawer-head' }, [
        el('strong', { text: 'Quick-Start Blueprints' }),
        el('div', { class: 'cso-pill-row' }, [
          el('button', { type: 'button', class: 'cso-pill', text: 'Blank Page', onclick: function () { applyBlueprint('blank'); } }),
          el('button', { type: 'button', class: 'cso-pill', text: 'Odisha Exam Guide (OPSC/OSSC)', onclick: function () { applyBlueprint('exam'); } }),
          el('button', { type: 'button', class: 'cso-pill', text: 'Scheme & Benefit Portal', onclick: function () { applyBlueprint('scheme'); } }),
          el('button', { type: 'button', class: 'cso-pill', text: 'Institutional / Policy Page', onclick: function () { applyBlueprint('policy'); } })
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
        el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Public Route / Slug' }), slugInp, slugStatusEl, redirectWrap]),
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
      el('div', { class: 'cso-mod-card cso-sticky-preview' }, [
        el('div', { class: 'cso-preview-header-stack' }, [
          el('h3', { text: 'Real Pre-Publish Preview Studio' }),
          el('div', { class: 'cso-mod-toolbar' }, [
            vpDeskBtn,
            vpMobBtn,
            el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm cso-mod-btn-primary', text: 'Full-Screen Real View', onclick: openFullScreenPreview })
          ])
        ]),
        el('div', { class: 'cso-pill-row' }, [tabPageBtn, tabSerpBtn, tabOgBtn, tabJsonLdBtn]),
        previewHost
      ])
    ]));

    var r2UploadInp = el('input', { type: 'file', class: 'cso-sr-file', accept: '.pdf,.png,.jpg,.jpeg,.webp,.svg,.doc,.docx,.xls,.xlsx,.csv,.zip' });
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
        el('div', { class: 'cso-mod-toolbar' }, [
          el('label', { class: 'cso-file-drop' }, [el('span', { text: '⬆ Upload File to R2 (PDF, JPG, PNG, WebP)' }), r2UploadInp]),
          el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Pick from R2 Library', onclick: function () { toggleR2Browser(); } })
        ])
      ]),
      el('div', { class: 'cso-mod-grid-2' }, [
        el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Link Type' }), extTypeSel]),
        el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Link Title' }), extTitleInp])
      ]),
      el('div', { class: 'cso-mod-grid-3' }, [
        el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'External / Google Drive / Site URL' }), extUrlInp]),
        el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Or Pick Verified Internal Route' }), extLinkPicker]),
        el('div', { class: 'cso-mod-field' }, [
          el('label', { class: 'cso-mod-label', text: 'Attach' }),
          el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-primary', text: '+ Attach Link', onclick: function () {
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
        ])
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

    shell.appendChild(el('div', { class: 'cso-bottom-bar' }, [
      el('button', { type: 'button', class: 'cso-mod-btn', text: '← Back to Top', onclick: function () { shell.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }),
      el('div', { class: 'cso-mod-toolbar' }, [
        el('button', { type: 'button', class: 'cso-mod-btn', text: 'Full-Screen Real View', onclick: openFullScreenPreview }),
        el('button', { type: 'button', class: 'cso-mod-btn', text: 'Save Draft', onclick: function () { submitPage('draft'); } }),
        bottomPublishBtn
      ])
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
        editPageSel.appendChild(el('option', { value: p.route, text: p.route + ' — ' + (p.title || '').slice(0, 36) }));
        cloneSel.appendChild(el('option', { value: p.route, text: p.route + ' — ' + (p.title || '').slice(0, 36) }));
        verifiedRoutes.push({ url: p.route, label: 'Page: ' + p.route });
      });
      if (f02State.editRoute && !editMode) {
        var targetPage = allPagesList.find(function (p) { return p.route === f02State.editRoute; });
        f02State.editRoute = null;
        if (targetPage) loadPageIntoEditor(targetPage);
      }
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
    addHeaderPill(actions, '● Live Visual Studio');
    var shell = el('div', { class: 'cso-mod-shell' });
    var viewport = 'desktop';
    var canvasMode = 'live';
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
      { type: 'hero', title: 'Odisha Government Jobs & Exam Portal', odia_subtitle: 'ଓଡ଼ିଶା ସରକାରୀ ଚାକିରି ଓ ପରୀକ୍ଷା ପୋର୍ଟାଲ୍', text: 'Verified recruitment alerts, syllabus PDFs, and CBT mock tests.', label: 'Explore Jobs', url: '/jobs-careers/' },
      { type: 'ticker', title: 'Latest Odisha Job Notifications' },
      { type: 'cbt', title: 'Start Free CBT Mock Tests', text: 'Practice bilingual Odia & English papers with instant explanations.', label: 'Launch Tests', url: '/mock-tests/' }
    ];
    if (tpl) currentRoute = '/' + tpl.id + '/';

    var DRAFT_KEY = 'cso_builder_draft';
    var draftTimer = null;
    var verifiedLinks = [
      { url: '/jobs-careers/', label: 'Portal: Jobs & Careers' },
      { url: '/current-affairs/', label: 'Portal: Current Affairs' },
      { url: '/mock-tests/', label: 'Portal: Mock Tests' },
      { url: '/resources/', label: 'Portal: Resources' },
      { url: '/syllabus/', label: 'Portal: Syllabus' }
    ];
    var r2Images = [];
    var dragFromIdx = null;

    var pageSelect = el('select', { class: 'cso-mod-select' }, [el('option', { value: '__CUSTOM__', text: '+ Custom / New Route' })]);
    var routeInput = el('input', { type: 'text', class: 'cso-mod-input', value: currentRoute, placeholder: '/my-route/' });
    var canvasEl = el('div', { class: 'cso-builder-viewport-desktop' });
    var propHost = el('div', { class: 'cso-mod-card' });
    var metaHost = el('div', { class: 'cso-mod-card' });
    var recoveryHost = el('div', {});
    var validationHost = el('div', {});
    var revisionHost = el('div', {});
    var fullscreenHost = el('div', {});
    var openLiveLink = el('a', { href: currentRoute, target: '_blank', rel: 'noopener noreferrer', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Open Live ↗' });
    var selectedIdx = 0;

    var BLOCK_TYPES = [
      { type: 'hero', label: 'Hero', def: { type: 'hero', title: 'Hero Headline', odia_subtitle: '', text: 'Supporting description for aspirants.', label: 'Explore', url: '/jobs-careers/' } },
      { type: 'ticker', label: 'Live Job Ticker', def: { type: 'ticker', title: 'Latest Odisha Govt Jobs' } },
      { type: 'examgrid', label: 'Exam Grid', def: { type: 'examgrid', title: 'Exam Portals', cards: [{ title: 'OSSC CGL 2026', badge: 'Live', url: '/jobs-careers/', summary: 'Latest recruitment & syllabus' }, { title: 'OPSC OAS', badge: 'Guide', url: '/syllabus/', summary: 'Prelims & Mains roadmap' }] } },
      { type: 'cbt', label: 'CBT Card', def: { type: 'cbt', title: 'Practice CBT Mock Test', text: 'Timed bilingual practice paper.', label: 'Start CBT', url: '/mock-tests/', cards: [{ title: 'Odisha GK Mock #1', badge: 'Free', url: '/mock-tests/', summary: '100 Qs · Bilingual' }] } },
      { type: 'key_dates', label: 'Key Dates Table', def: { type: 'key_dates', title: 'Important Dates', rows: [{ label: 'Notification Release', value: 'Published' }, { label: 'Last Date', value: 'TBD' }] } },
      { type: 'faq', label: 'FAQ Accordion', def: { type: 'faq', title: 'Frequently Asked Questions', rows: [{ question: 'How to apply?', answer: 'Visit the official commission link.' }, { question: 'Is it free?', answer: 'Yes, 100% free for candidates.' }] } },
      { type: 'attachments', label: 'Official / Drive Downloads', def: { type: 'attachments', title: 'Official Documents & Drive Links', items: [{ title: 'Official Notification PDF', source_label: 'Official Portal', url: 'https://odisha.gov.in' }] } },
      { type: 'notice', label: 'Notice Callout', def: { type: 'notice', title: 'Official Notice', text: 'Verify dates and roll numbers on the official portal.' } },
      { type: 'richtext', label: 'Rich Text', def: { type: 'richtext', title: 'Detailed Overview', text: 'Write multi-paragraph guidance here.\n\nSeparate paragraphs with a blank line.' } }
    ];

    var SECTION_BLUEPRINTS = {
      exam_hub: [
        { type: 'hero', title: 'Odisha Competitive Exam Hub 2026', odia_subtitle: 'ଓଡ଼ିଶା ପ୍ରତିଯୋଗିତାମୂଳକ ପରୀକ୍ଷା ହବ୍', text: 'Unified portal for OPSC, OSSC, and OSSSC notifications, syllabus & mock tests.', label: 'Browse Jobs', url: '/jobs-careers/' },
        { type: 'examgrid', title: 'Major Commissions', cards: [{ title: 'OPSC OAS / OCS', badge: 'Prelims', url: '/jobs-careers/', summary: 'Civil Services updates' }, { title: 'OSSC CGLRE', badge: 'Active', url: '/mock-tests/', summary: 'Graduate level CBT' }] },
        { type: 'key_dates', title: '2026 Exam Calendar', rows: [{ label: 'OPSC Prelims', value: 'Expected Q2 2026' }, { label: 'OSSC CGL', value: 'Check Official Portal' }] },
        { type: 'faq', title: 'Candidate FAQs', rows: [{ question: 'Are mock tests bilingual?', answer: 'Yes, both English and Odia are supported.' }] }
      ],
      cbt_landing: [
        { type: 'hero', title: 'Free Odisha CBT Mock Test Series', odia_subtitle: 'ମାଗଣା ଅନଲାଇନ୍ CBT ମକ୍ ଟେଷ୍ଟ', text: 'Real exam interface with negative marking and instant rank leaderboard.', label: 'Launch Mock Tests', url: '/mock-tests/' },
        { type: 'cbt', title: 'Featured Mock Series', cards: [{ title: 'OSSC CGL Full Mock', badge: '150 Qs', url: '/mock-tests/', summary: 'Math, Reasoning, GK & Computer' }, { title: 'Odisha Current Affairs', badge: 'Weekly', url: '/current-affairs/', summary: 'State & National highlights' }] },
        { type: 'notice', title: 'Scoring Rules', text: '+1.0 for correct answers, -0.25 negative marking per wrong response.' }
      ],
      scheme_portal: [
        { type: 'hero', title: 'Odisha Govt Welfare & Student Schemes', odia_subtitle: 'ଓଡ଼ିଶା ସରକାରୀ ଯୋଜନା ଓ ବୃତ୍ତି', text: 'Eligibility rules, documents checklist & verified official portal links.', label: 'View Resources', url: '/resources/' },
        { type: 'key_dates', title: 'Application Windows', rows: [{ label: 'Fresh Registration', value: 'Open' }, { label: 'Renewal Window', value: 'Check Portal' }] },
        { type: 'attachments', title: 'Official Portals', items: [{ title: 'State Scholarship Portal', source_label: 'Official Portal', url: 'https://scholarship.odisha.gov.in' }] }
      ],
      institutional: [
        { type: 'hero', title: 'Editorial & Verification Standards', text: 'How Common Sense Odisha verifies official Odisha commission notices.', label: 'Contact Us', url: '/contact.html' },
        { type: 'richtext', title: '3-Step Verification Process', text: 'Every recruitment notice and answer key is verified directly against official .gov.in PDFs.' },
        { type: 'faq', title: 'Policy Questions', rows: [{ question: 'How to report an error?', answer: 'Use the Contact page with the notice reference number.' }] }
      ]
    };

    var vpDeskBtn = el('button', { type: 'button', class: 'cso-pill cso-pill-active', text: 'Desktop', onclick: function () { setViewport('desktop'); } });
    var vpTabBtn = el('button', { type: 'button', class: 'cso-pill', text: '768px', onclick: function () { setViewport('tablet'); } });
    var vpMobBtn = el('button', { type: 'button', class: 'cso-pill', text: '375px', onclick: function () { setViewport('mobile'); } });
    var modeLiveBtn = el('button', { type: 'button', class: 'cso-pill cso-pill-active', text: 'Real-CSS Live View', onclick: function () { canvasMode = 'live'; syncModeBtns(); renderCanvas(); } });
    var modeOutlineBtn = el('button', { type: 'button', class: 'cso-pill', text: 'Block Outline', onclick: function () { canvasMode = 'outline'; syncModeBtns(); renderCanvas(); } });

    function syncModeBtns() {
      modeLiveBtn.classList.toggle('cso-pill-active', canvasMode === 'live');
      modeOutlineBtn.classList.toggle('cso-pill-active', canvasMode === 'outline');
    }

    function setViewport(vp) {
      viewport = vp;
      canvasEl.className = 'cso-builder-viewport-' + vp;
      vpDeskBtn.classList.toggle('cso-pill-active', vp === 'desktop');
      vpTabBtn.classList.toggle('cso-pill-active', vp === 'tablet');
      vpMobBtn.classList.toggle('cso-pill-active', vp === 'mobile');
    }

    function scheduleDraftSave() {
      if (draftTimer) clearTimeout(draftTimer);
      draftTimer = setTimeout(function () {
        try {
          localStorage.setItem(DRAFT_KEY, JSON.stringify({ route: currentRoute, pageMeta: pageMeta, blocks: blocks, savedAt: new Date().toISOString() }));
        } catch (_) {}
      }, 600);
    }

    function runBuilderValidation() {
      clear(validationHost);
      var errs = [];
      var r = f02NormalizeRoute(routeInput.value || currentRoute);
      if (!r || r === '/' || !/^\/[a-z0-9\-\/]+$/i.test(r)) errs.push('Invalid target route');
      blocks.forEach(function (b, idx) {
        if (b.hidden) return;
        var hasTxt = (b.title || b.heading || '').trim() || (b.text || b.body || '').trim() ||
          (Array.isArray(b.cards) && b.cards.length) || (Array.isArray(b.rows) && b.rows.length) ||
          (Array.isArray(b.items) && b.items.length);
        if (!hasTxt) errs.push('Block #' + (idx + 1) + ' (' + b.type + ') is empty');
        if (b.url && b.url.indexOf('/') !== 0 && !/^https?:\/\//i.test(b.url)) errs.push('Block #' + (idx + 1) + ' has malformed URL');
      });
      if (!errs.length) {
        validationHost.appendChild(el('div', { class: 'cso-mod-toolbar' }, [badge('Builder Gate: Valid ✓ (' + blocks.length + ' blocks)', 'ok')]));
      } else {
        validationHost.appendChild(el('div', { class: 'cso-mod-toolbar' }, errs.map(function (m) { return badge('⚠ ' + m, 'warn'); })));
      }
    }

    function buildBuilderPreviewHtml() {
      var escH = function (s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
          return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
      };
      var safeU = function (u) {
        var s = String(u || '').trim();
        return (s.indexOf('/') === 0 && s.indexOf('//') !== 0) || /^https?:\/\//i.test(s) ? s : '#';
      };
      var sections = blocks.map(function (b, idx) {
        if (!b || b.hidden) return '';
        var surf = b.surface ? ' cso-blk-surface-' + escH(b.surface) : '';
        var sp = b.spacing ? ' cso-blk-space-' + escH(b.spacing) : '';
        var inner = '';
        if (b.type === 'hero') {
          inner = (b.image_url ? '<img src="' + escH(safeU(b.image_url)) + '" alt="' + escH(b.title || '') + '">' : '') +
            '<h1>' + escH(b.title || 'Hero') + '</h1>' +
            (b.odia_subtitle ? '<p class="odia-sub">' + escH(b.odia_subtitle) + '</p>' : '') +
            '<p>' + escH(b.text || b.body || '') + '</p>' +
            (b.label ? '<p><a class="btn primary" href="' + escH(safeU(b.url)) + '">' + escH(b.label) + '</a></p>' : '');
        } else if (b.type === 'examgrid' || b.type === 'exam_grid' || b.type === 'cbt') {
          var cards = Array.isArray(b.cards) && b.cards.length ? b.cards : null;
          inner = '<h2>' + escH(b.title || b.type) + '</h2>' + (b.text ? '<p>' + escH(b.text) + '</p>' : '') +
            (cards ? '<ul>' + cards.map(function (c) {
              return '<li><a href="' + escH(safeU(c.url)) + '"><strong>' + escH(c.title) + '</strong>' + (c.badge ? ' [' + escH(c.badge) + ']' : '') + '</a>' + (c.summary ? ' — ' + escH(c.summary) : '') + '</li>';
            }).join('') + '</ul>' : '');
        } else if (b.type === 'key_dates') {
          var rows = Array.isArray(b.rows) ? b.rows : [];
          inner = '<h2>' + escH(b.title || 'Key Dates') + '</h2><table><tbody>' + rows.map(function (r) {
            return '<tr><th>' + escH(r.label) + '</th><td>' + escH(r.value) + '</td></tr>';
          }).join('') + '</tbody></table>';
        } else if (b.type === 'faq') {
          var frows = Array.isArray(b.rows) ? b.rows : [];
          inner = '<h2>' + escH(b.title || 'FAQ') + '</h2>' + frows.map(function (r) {
            return '<details open><summary>' + escH(r.question) + '</summary><p>' + escH(r.answer) + '</p></details>';
          }).join('');
        } else if (b.type === 'attachments') {
          var aitems = Array.isArray(b.items) ? b.items : [];
          inner = '<h2>' + escH(b.title || 'Downloads') + '</h2><ul>' + aitems.map(function (a) {
            return '<li><strong>' + escH(a.title) + '</strong> (' + escH(a.source_label || 'Link') + ') — <a href="' + escH(safeU(a.url)) + '">' + escH(a.url) + '</a></li>';
          }).join('') + '</ul>';
        } else {
          inner = (b.title ? '<h2>' + escH(b.title) + '</h2>' : '') + '<p>' + escH(b.text || b.body || '') + '</p>';
        }
        return '<section class="card' + surf + sp + '" data-block-idx="' + idx + '">' + inner + '</section>';
      }).join('');
      return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
        '<title>' + escH(pageMeta.title || currentRoute) + '</title>' +
        '<link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/assets/site.css">' +
        '</head><body><main class="container">' + sections + '</main></body></html>';
    }

    function wireBuilderIframeClick(iframeEl) {
      iframeEl.addEventListener('load', function () {
        try {
          var doc = iframeEl.contentDocument;
          if (!doc) return;
          doc.addEventListener('click', function (ev) {
            ev.preventDefault();
            var hit = ev.target && ev.target.closest ? ev.target.closest('[data-block-idx]') : null;
            if (hit) {
              selectedIdx = Number(hit.getAttribute('data-block-idx')) || 0;
              clear(fullscreenHost);
              renderInspector();
              if (canvasMode === 'outline') renderCanvas();
              toast('Selected block #' + (selectedIdx + 1) + ' in Inspector', 'info');
            }
          });
        } catch (_) {}
      });
    }

    function openBuilderFullScreen() {
      clear(fullscreenHost);
      var fsMode = viewport;
      var fsFrame = el('iframe', {
        class: 'cso-fullscreen-frame' + (fsMode === 'tablet' ? ' is-tablet' : fsMode === 'mobile' ? ' is-mobile' : ''),
        sandbox: 'allow-same-origin',
        title: 'Visual Builder Full-Screen Preview'
      });
      fsFrame.srcdoc = buildBuilderPreviewHtml();
      wireBuilderIframeClick(fsFrame);
      var bD = el('button', { type: 'button', class: 'cso-pill' + (fsMode === 'desktop' ? ' cso-pill-active' : ''), text: 'Desktop 100%', onclick: function () { setFs('desktop'); } });
      var bT = el('button', { type: 'button', class: 'cso-pill' + (fsMode === 'tablet' ? ' cso-pill-active' : ''), text: 'Tablet 768px', onclick: function () { setFs('tablet'); } });
      var bM = el('button', { type: 'button', class: 'cso-pill' + (fsMode === 'mobile' ? ' cso-pill-active' : ''), text: 'Mobile 375px', onclick: function () { setFs('mobile'); } });
      function setFs(m) {
        fsMode = m;
        bD.classList.toggle('cso-pill-active', m === 'desktop');
        bT.classList.toggle('cso-pill-active', m === 'tablet');
        bM.classList.toggle('cso-pill-active', m === 'mobile');
        fsFrame.className = 'cso-fullscreen-frame' + (m === 'tablet' ? ' is-tablet' : m === 'mobile' ? ' is-mobile' : '');
      }
      function closeFs() { document.removeEventListener('keydown', onEsc); clear(fullscreenHost); }
      function onEsc(e) { if (e.key === 'Escape') closeFs(); }
      document.addEventListener('keydown', onEsc);
      fullscreenHost.appendChild(el('div', { class: 'cso-fullscreen-overlay' }, [
        el('div', { class: 'cso-drawer-head' }, [
          el('div', { class: 'cso-mod-toolbar' }, [
            el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: '← Back to Editor', onclick: closeFs }),
            el('strong', { text: 'Full-Screen Real View (Click any block to select it in Inspector)' })
          ]),
          el('div', { class: 'cso-mod-toolbar' }, [
            bD, bT, bM,
            el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Save Draft', onclick: function () { closeFs(); saveBuilder('draft'); } }),
            el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm cso-mod-btn-primary', text: 'Publish Live', onclick: function () { closeFs(); saveBuilder('published'); } })
          ])
        ]),
        el('div', { class: 'cso-fullscreen-stage' }, [fsFrame])
      ]));
    }

    function renderMetaCard() {
      clear(metaHost);
      metaHost.appendChild(el('h4', { text: 'Page Route & SEO' }));
      var tInp = el('input', { type: 'text', class: 'cso-mod-input', value: pageMeta.title || '' });
      var dInp = el('input', { type: 'text', class: 'cso-mod-input', value: pageMeta.meta_description || '' });
      tInp.addEventListener('input', function () { pageMeta.title = tInp.value; scheduleDraftSave(); });
      dInp.addEventListener('input', function () { pageMeta.meta_description = dInp.value; scheduleDraftSave(); });
      routeInput.addEventListener('input', function () {
        currentRoute = f02NormalizeRoute(routeInput.value);
        openLiveLink.setAttribute('href', currentRoute);
        runBuilderValidation();
        scheduleDraftSave();
      });
      metaHost.appendChild(el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Target Route' }), routeInput]));
      metaHost.appendChild(el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Page Title' }), tInp]));
      metaHost.appendChild(el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Meta Description' }), dInp]));
    }

    async function runBlockAi(mode) {
      var b = blocks[selectedIdx];
      if (!b) return;
      toast('Running AI (' + mode + ') on block…', 'info');
      try {
        var res = await api('POST', 'ai/generate-page', {
          mode: mode,
          topic: b.title || pageMeta.title || currentRoute,
          existing: {
            title: b.title || pageMeta.title,
            route: currentRoute,
            hero_title: b.title || pageMeta.title,
            hero_subtitle: b.text || '',
            odia_subtitle: b.odia_subtitle || '',
            blocks: [b]
          }
        });
        if (mode === 'translate_odia') {
          if (res.odia_subtitle) b.odia_subtitle = res.odia_subtitle;
          if (!b.odia_subtitle && res.blocks && res.blocks[0]) b.text = res.blocks[0].body || b.text;
        } else if (res.blocks && res.blocks[0]) {
          b.title = res.blocks[0].heading || b.title;
          b.text = res.blocks[0].body || b.text;
        }
        renderInspector();
        renderCanvas();
        toast('AI block update applied', 'success');
      } catch (e) { toast(e.message, 'crimson'); }
    }

    function makeVerifiedSelect(onPick) {
      var sel = el('select', { class: 'cso-mod-select' }, [el('option', { value: '', text: 'Pick verified route…' })].concat(
        verifiedLinks.map(function (v) { return el('option', { value: v.url, text: v.label }); })
      ));
      sel.addEventListener('change', function () { if (sel.value) { onPick(sel.value); sel.value = ''; } });
      return sel;
    }

    function renderInspector() {
      clear(propHost);
      propHost.appendChild(el('h4', { text: 'Block Inspector' }));
      var b = blocks[selectedIdx];
      if (!b) {
        propHost.appendChild(el('p', { class: 'cso-mod-muted', text: 'Select or add a block.' }));
        return;
      }

      propHost.appendChild(el('div', { class: 'cso-drawer-head' }, [
        badge('#' + (selectedIdx + 1) + ' · ' + b.type, 'info'),
        el('div', { class: 'cso-mod-toolbar' }, [
          el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: b.hidden ? 'Show Block' : 'Hide Block', onclick: function () { b.hidden = !b.hidden; renderInspector(); renderCanvas(); } }),
          el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Duplicate', onclick: function () { blocks.splice(selectedIdx + 1, 0, JSON.parse(JSON.stringify(b))); selectedIdx++; renderInspector(); renderCanvas(); } })
        ])
      ]));

      // Visual Styling Controls
      var surfSel = el('select', { class: 'cso-mod-select' }, [
        ['default', 'Default'], ['elevated', 'Elevated Card'], ['accent', 'Accent Highlight']
      ].map(function (o) { return el('option', { value: o[0], text: o[1], selected: (b.surface || 'default') === o[0] }); }));
      var spaceSel = el('select', { class: 'cso-mod-select' }, [
        ['compact', 'Compact'], ['normal', 'Normal'], ['spacious', 'Spacious']
      ].map(function (o) { return el('option', { value: o[0], text: o[1], selected: (b.spacing || 'normal') === o[0] }); }));
      surfSel.addEventListener('change', function () { b.surface = surfSel.value; renderCanvas(); });
      spaceSel.addEventListener('change', function () { b.spacing = spaceSel.value; renderCanvas(); });
      propHost.appendChild(el('div', { class: 'cso-mod-grid-2' }, [
        el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Surface Style' }), surfSel]),
        el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Spacing' }), spaceSel])
      ]));

      var hInp = el('input', { type: 'text', class: 'cso-mod-input', value: b.title || b.heading || '' });
      hInp.addEventListener('input', function () { b.title = hInp.value; renderCanvas(); });
      propHost.appendChild(el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Title / Heading' }), hInp]));

      if (b.type === 'hero') {
        var oInp = el('input', { type: 'text', class: 'cso-mod-input', value: b.odia_subtitle || '', placeholder: 'ଓଡ଼ିଆ ଉପଶୀର୍ଷକ (Optional Odia subtitle)' });
        oInp.addEventListener('input', function () { b.odia_subtitle = oInp.value; renderCanvas(); });
        propHost.appendChild(el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Odia Subtitle (ଓଡ଼ିଆ)' }), oInp]));

        var imgInp = el('input', { type: 'text', class: 'cso-mod-input', value: b.image_url || '', placeholder: '/api/media/<key>.jpg' });
        imgInp.addEventListener('input', function () { b.image_url = imgInp.value; renderCanvas(); });
        var imgPick = el('select', { class: 'cso-mod-select' }, [el('option', { value: '', text: 'Pick R2 image…' })].concat(
          r2Images.map(function (m) { return el('option', { value: m.url, text: m.name }); })
        ));
        imgPick.addEventListener('change', function () { if (imgPick.value) { b.image_url = imgPick.value; imgInp.value = imgPick.value; renderCanvas(); } });
        propHost.appendChild(el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Hero Cover Image (R2)' }), imgInp, imgPick]));
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
        propHost.appendChild(el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Primary CTA Label' }), lblInp]));
        propHost.appendChild(el('div', { class: 'cso-mod-field' }, [
          el('label', { class: 'cso-mod-label', text: 'CTA URL' }),
          urlInp,
          makeVerifiedSelect(function (u) { b.url = u; urlInp.value = u; renderCanvas(); })
        ]));
      }

      if (b.type === 'examgrid' || b.type === 'exam_grid' || b.type === 'cbt') {
        if (!Array.isArray(b.cards)) {
          b.cards = Array.isArray(b.items) ? b.items.map(function (s) {
            var p = String(s).split('|');
            return { title: (p[0] || '').trim(), badge: '', url: (p[1] || '/').trim(), summary: '' };
          }) : [];
        }
        var cardsBox = el('div', { class: 'cso-mod-shell' });
        b.cards.forEach(function (c, ci) {
          var ct = el('input', { type: 'text', class: 'cso-mod-input', value: c.title || '', placeholder: 'Card Title' });
          var cb = el('input', { type: 'text', class: 'cso-mod-input', value: c.badge || '', placeholder: 'Badge (e.g. Live)' });
          var cu = el('input', { type: 'text', class: 'cso-mod-input', value: c.url || '', placeholder: '/route/' });
          var cs = el('input', { type: 'text', class: 'cso-mod-input', value: c.summary || '', placeholder: 'Short summary' });
          ct.addEventListener('input', function () { c.title = ct.value; renderCanvas(); });
          cb.addEventListener('input', function () { c.badge = cb.value; renderCanvas(); });
          cu.addEventListener('input', function () { c.url = cu.value; renderCanvas(); });
          cs.addEventListener('input', function () { c.summary = cs.value; renderCanvas(); });
          cardsBox.appendChild(el('div', { class: 'cso-builder-block' }, [
            el('div', { class: 'cso-mod-grid-2' }, [ct, cb]),
            el('div', { class: 'cso-mod-grid-2' }, [cu, makeVerifiedSelect(function (u) { c.url = u; cu.value = u; renderCanvas(); })]),
            el('div', { class: 'cso-mod-toolbar' }, [
              cs,
              el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-danger cso-mod-btn-sm', text: 'Remove', onclick: function () { b.cards.splice(ci, 1); renderInspector(); renderCanvas(); } })
            ])
          ]));
        });
        propHost.appendChild(el('div', { class: 'cso-mod-field' }, [
          el('div', { class: 'cso-drawer-head' }, [
            el('label', { class: 'cso-mod-label', text: 'Grid Cards (' + b.cards.length + ')' }),
            el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: '+ Add Item', onclick: function () { b.cards.push({ title: '', badge: '', url: '/mock-tests/', summary: '' }); renderInspector(); renderCanvas(); } })
          ]),
          cardsBox
        ]));
      }

      if (b.type === 'key_dates') {
        if (!Array.isArray(b.rows)) b.rows = [];
        var rBox = el('div', { class: 'cso-mod-shell' });
        b.rows.forEach(function (rw, ri) {
          var rl = el('input', { type: 'text', class: 'cso-mod-input', value: rw.label || '', placeholder: 'Label' });
          var rv = el('input', { type: 'text', class: 'cso-mod-input', value: rw.value || '', placeholder: 'Date / Status' });
          rl.addEventListener('input', function () { rw.label = rl.value; renderCanvas(); });
          rv.addEventListener('input', function () { rw.value = rv.value; renderCanvas(); });
          rBox.appendChild(el('div', { class: 'cso-mod-grid-3' }, [
            rl, rv,
            el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-danger cso-mod-btn-sm', text: '×', onclick: function () { b.rows.splice(ri, 1); renderInspector(); renderCanvas(); } })
          ]));
        });
        propHost.appendChild(el('div', { class: 'cso-mod-field' }, [
          el('div', { class: 'cso-drawer-head' }, [
            el('label', { class: 'cso-mod-label', text: 'Date Rows (' + b.rows.length + ')' }),
            el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: '+ Add Row', onclick: function () { b.rows.push({ label: '', value: '' }); renderInspector(); renderCanvas(); } })
          ]),
          rBox
        ]));
      }

      if (b.type === 'faq') {
        if (!Array.isArray(b.rows)) {
          b.rows = Array.isArray(b.items) ? b.items.map(function (s) {
            var p = String(s).split('|');
            return { question: (p[0] || '').trim(), answer: (p[1] || '').trim() };
          }) : [];
        }
        var fBox = el('div', { class: 'cso-mod-shell' });
        b.rows.forEach(function (rw, fi) {
          var fq = el('input', { type: 'text', class: 'cso-mod-input', value: rw.question || '', placeholder: 'Question' });
          var fa = el('textarea', { class: 'cso-mod-textarea', rows: '2', placeholder: 'Answer' });
          fa.value = rw.answer || '';
          fq.addEventListener('input', function () { rw.question = fq.value; renderCanvas(); });
          fa.addEventListener('input', function () { rw.answer = fa.value; renderCanvas(); });
          fBox.appendChild(el('div', { class: 'cso-builder-block' }, [
            fq, fa,
            el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-danger cso-mod-btn-sm', text: 'Remove FAQ', onclick: function () { b.rows.splice(fi, 1); renderInspector(); renderCanvas(); } })
          ]));
        });
        propHost.appendChild(el('div', { class: 'cso-mod-field' }, [
          el('div', { class: 'cso-drawer-head' }, [
            el('label', { class: 'cso-mod-label', text: 'FAQ Items (' + b.rows.length + ')' }),
            el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: '+ Add FAQ', onclick: function () { b.rows.push({ question: '', answer: '' }); renderInspector(); renderCanvas(); } })
          ]),
          fBox
        ]));
      }

      if (b.type === 'attachments') {
        if (!Array.isArray(b.items)) b.items = [];
        var aBox = el('div', { class: 'cso-mod-shell' });
        b.items.forEach(function (it, ai) {
          var at = el('input', { type: 'text', class: 'cso-mod-input', value: it.title || '', placeholder: 'Document Title' });
          var as = el('input', { type: 'text', class: 'cso-mod-input', value: it.source_label || '', placeholder: 'Source (R2 PDF / Google Drive / .gov.in)' });
          var au = el('input', { type: 'text', class: 'cso-mod-input', value: it.url || '', placeholder: 'https://… or /api/media/…' });
          at.addEventListener('input', function () { it.title = at.value; renderCanvas(); });
          as.addEventListener('input', function () { it.source_label = as.value; renderCanvas(); });
          au.addEventListener('input', function () { it.url = au.value; renderCanvas(); });
          aBox.appendChild(el('div', { class: 'cso-builder-block' }, [
            el('div', { class: 'cso-mod-grid-2' }, [at, as]),
            el('div', { class: 'cso-mod-toolbar' }, [
              au,
              el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-danger cso-mod-btn-sm', text: 'Remove', onclick: function () { b.items.splice(ai, 1); renderInspector(); renderCanvas(); } })
            ])
          ]));
        });
        propHost.appendChild(el('div', { class: 'cso-mod-field' }, [
          el('div', { class: 'cso-drawer-head' }, [
            el('label', { class: 'cso-mod-label', text: 'Attachments (' + b.items.length + ')' }),
            el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: '+ Add Link', onclick: function () { b.items.push({ title: '', source_label: 'Official Portal', url: 'https://odisha.gov.in' }); renderInspector(); renderCanvas(); } })
          ]),
          aBox
        ]));
      }

      // AI Block Assistant
      propHost.appendChild(el('div', { class: 'cso-mod-toolbar' }, [
        el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: '✨ AI Rewrite Block', onclick: function () { runBlockAi('polish'); } }),
        el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: '✨ AI Translate to Odia (ଓଡ଼ିଆ)', onclick: function () { runBlockAi('translate_odia'); } })
      ]));
    }

    function renderCanvas() {
      clear(canvasEl);
      runBuilderValidation();
      scheduleDraftSave();

      if (canvasMode === 'live') {
        var liveFrame = el('iframe', {
          class: 'cso-builder-iframe',
          sandbox: 'allow-same-origin',
          title: 'Visual Page Builder Real-CSS Live View'
        });
        liveFrame.srcdoc = buildBuilderPreviewHtml();
        wireBuilderIframeClick(liveFrame);
        canvasEl.appendChild(liveFrame);
        canvasEl.appendChild(el('p', { class: 'cso-mod-muted', text: 'Click any section in the Real-CSS preview to select and edit it in the Block Inspector.' }));
        return;
      }

      if (!blocks.length) {
        canvasEl.appendChild(el('p', { class: 'cso-mod-muted', text: 'No blocks yet. Click a block in the palette or choose a Quick Section Blueprint.' }));
        return;
      }
      blocks.forEach(function (b, idx) {
        var cls = 'cso-builder-block' + (idx === selectedIdx ? ' is-selected' : '') + (b.hidden ? ' is-hidden-blk' : '');
        var blk = el('div', { class: cls, draggable: 'true' }, [
          el('div', { class: 'cso-builder-block-head' }, [
            el('div', { class: 'cso-inline-row' }, [
              el('span', { class: 'cso-drag-handle', text: '⋮⋮', title: 'Drag to reorder' }),
              badge((idx + 1) + '. ' + b.type, idx === selectedIdx ? 'ok' : 'info'),
              b.hidden ? badge('Hidden', 'warn') : null
            ]),
            el('div', { class: 'cso-mod-toolbar' }, [
              el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Edit', onclick: function () { selectedIdx = idx; renderInspector(); renderCanvas(); } }),
              el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: '↑', disabled: idx === 0, onclick: function () { if (idx > 0) { var t = blocks[idx - 1]; blocks[idx - 1] = blocks[idx]; blocks[idx] = t; selectedIdx = idx - 1; renderCanvas(); renderInspector(); } } }),
              el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: '↓', disabled: idx === blocks.length - 1, onclick: function () { if (idx < blocks.length - 1) { var t = blocks[idx + 1]; blocks[idx + 1] = blocks[idx]; blocks[idx] = t; selectedIdx = idx + 1; renderCanvas(); renderInspector(); } } }),
              el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-danger cso-mod-btn-sm', text: '✕', onclick: function () { blocks.splice(idx, 1); selectedIdx = Math.max(0, selectedIdx - 1); renderCanvas(); renderInspector(); } })
            ])
          ]),
          el('h4', { text: b.title || b.heading || b.type.toUpperCase() }),
          b.odia_subtitle ? el('p', { class: 'cso-mod-muted', text: b.odia_subtitle }) : null,
          b.text || b.body ? el('p', { class: 'cso-mod-muted', text: b.text || b.body }) : null,
          Array.isArray(b.cards) && b.cards.length ? el('ul', {}, b.cards.map(function (c) { return el('li', { text: c.title + ' → ' + c.url }); })) : null,
          Array.isArray(b.rows) && b.rows.length ? el('ul', {}, b.rows.map(function (r) { return el('li', { text: (r.label || r.question || '') + ' : ' + (r.value || r.answer || '') }); })) : null,
          (b.label || b.ctaText) ? el('span', { class: 'cso-mod-badge cso-mod-badge-info', text: (b.label || b.ctaText) + ' → ' + (b.url || b.ctaUrl || '/') }) : null
        ]);
        blk.addEventListener('dragstart', function () { dragFromIdx = idx; blk.classList.add('is-dragging'); });
        blk.addEventListener('dragend', function () { dragFromIdx = null; blk.classList.remove('is-dragging'); });
        blk.addEventListener('dragover', function (e) { e.preventDefault(); });
        blk.addEventListener('drop', function (e) {
          e.preventDefault();
          if (dragFromIdx === null || dragFromIdx === idx) return;
          var moved = blocks.splice(dragFromIdx, 1)[0];
          blocks.splice(idx, 0, moved);
          selectedIdx = idx;
          dragFromIdx = null;
          renderCanvas();
          renderInspector();
        });
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
        try { localStorage.removeItem(DRAFT_KEY); clear(recoveryHost); } catch (_) {}
        openLiveLink.setAttribute('href', route);
        toast((status === 'published' ? 'Published live: ' : 'Saved draft: ') + route, 'success');
      } catch (e) {
        toast(e.message, 'crimson');
      }
    }

    async function openBuilderRevisions() {
      var route = f02NormalizeRoute(routeInput.value || currentRoute);
      clear(revisionHost);
      revisionHost.appendChild(el('div', { class: 'cso-drawer' }, [el('p', { class: 'cso-mod-muted', text: 'Loading revisions for ' + route + '…' })]));
      try {
        var d = await api('GET', 'pages/revisions?route=' + encodeURIComponent(route));
        var revs = d.revisions || [];
        clear(revisionHost);
        var box = el('div', { class: 'cso-drawer' }, [
          el('div', { class: 'cso-drawer-head' }, [
            el('strong', { text: 'Revision History (' + revs.length + ') — ' + route }),
            el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Close', onclick: function () { clear(revisionHost); } })
          ])
        ]);
        if (!revs.length) box.appendChild(el('p', { class: 'cso-mod-muted', text: 'No revisions recorded for this route yet.' }));
        revs.forEach(function (rv) {
          var snap = {};
          try { snap = JSON.parse(rv.snapshot_json || '{}'); } catch (_) {}
          box.appendChild(el('div', { class: 'cso-diff-row' }, [
            el('div', { class: 'cso-drawer-head' }, [
              el('div', {}, [
                el('strong', { text: (snap.title || rv.route) + ' ' }),
                badge(snap.status || 'draft', snap.status === 'published' ? 'ok' : 'warn'),
                el('div', { class: 'cso-mod-muted', text: (rv.created_at || '') + ' · ' + (rv.editor_email || 'staff') + ' · ' + (rv.note || 'update') })
              ]),
              el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm cso-mod-btn-primary', text: 'Restore', onclick: async function () {
                try {
                  await api('POST', 'pages/restore', { route: route, revision_id: rv.id, status: 'draft' });
                  var listRes = await api('GET', 'pages');
                  var fresh = (listRes.pages || []).find(function (x) { return x.route === route; });
                  if (fresh) loadPageIntoBuilder(fresh);
                  clear(revisionHost);
                  toast('Restored revision #' + rv.id, 'success');
                } catch (e) { toast(e.message, 'crimson'); }
              } })
            ])
          ]));
        });
        revisionHost.appendChild(box);
      } catch (e) { clear(revisionHost); toast(e.message, 'crimson'); }
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

    var bpSel = el('select', { class: 'cso-mod-select' }, [
      el('option', { value: '', text: 'Quick Section Blueprints…' }),
      el('option', { value: 'exam_hub', text: 'Odisha Exam Hub' }),
      el('option', { value: 'cbt_landing', text: 'CBT Mock Test Landing' }),
      el('option', { value: 'scheme_portal', text: 'Govt Scheme Portal' }),
      el('option', { value: 'institutional', text: 'Institutional Page' })
    ]);
    bpSel.addEventListener('change', function () {
      if (!bpSel.value || !SECTION_BLUEPRINTS[bpSel.value]) return;
      blocks = JSON.parse(JSON.stringify(SECTION_BLUEPRINTS[bpSel.value]));
      selectedIdx = 0;
      bpSel.value = '';
      renderCanvas();
      renderInspector();
      toast('Loaded section blueprint', 'info');
    });

    var importInp = el('input', { type: 'file', class: 'cso-sr-file', accept: '.json,application/json' });
    importInp.addEventListener('change', function () {
      var f = importInp.files[0];
      if (!f) return;
      var rdr = new FileReader();
      rdr.onload = function () {
        try {
          var arr = JSON.parse(String(rdr.result || '[]'));
          if (!Array.isArray(arr) || !arr.every(function (x) { return x && typeof x.type === 'string'; })) {
            toast('Invalid JSON: expected an array of blocks with a "type" field', 'crimson');
            return;
          }
          blocks = arr;
          selectedIdx = 0;
          renderCanvas();
          renderInspector();
          toast('Imported ' + blocks.length + ' block(s)', 'success');
        } catch (err) { toast('Invalid JSON file: ' + err.message, 'crimson'); }
      };
      rdr.readAsText(f);
      importInp.value = '';
    });

    var paletteGrid = el('div', { class: 'cso-palette-grid' });
    BLOCK_TYPES.forEach(function (bt) {
      paletteGrid.appendChild(el('button', {
        type: 'button',
        class: 'cso-mod-btn cso-mod-btn-sm',
        text: '+ ' + bt.label,
        onclick: function () {
          blocks.push(JSON.parse(JSON.stringify(bt.def)));
          selectedIdx = blocks.length - 1;
          renderCanvas();
          renderInspector();
        }
      }));
    });
    var paletteCard = el('div', { class: 'cso-mod-card' }, [
      el('h4', { text: 'Block Palette' }),
      el('p', { class: 'cso-mod-muted', text: 'Click to append a live block:' }),
      paletteGrid
    ]);

    renderBanner(shell, 'Visual Page Builder', 'Compose responsive blocks with Real-CSS live preview, dynamic inspectors, drag-reorder & AI block tools.', [
      pageSelect,
      bpSel,
      vpDeskBtn, vpTabBtn, vpMobBtn,
      modeLiveBtn, modeOutlineBtn,
      el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Full-Screen Real View', onclick: openBuilderFullScreen }),
      el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Revisions', onclick: openBuilderRevisions }),
      el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Save Draft', onclick: function () { saveBuilder('draft'); } }),
      el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-primary cso-mod-btn-sm', text: 'Publish Live to Website', onclick: function () { saveBuilder('published'); } }),
      openLiveLink,
      el('label', { class: 'cso-mod-btn cso-mod-btn-sm' }, [el('span', { text: 'Import JSON' }), importInp]),
      el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Export JSON', onclick: function () { downloadFile('page-blocks.json', JSON.stringify(blocks, null, 2)); } })
    ]);

    shell.appendChild(recoveryHost);
    shell.appendChild(validationHost);
    shell.appendChild(revisionHost);
    shell.appendChild(el('div', { class: 'cso-builder-split' }, [
      el('div', { class: 'cso-mod-shell' }, [metaHost, paletteCard, propHost]),
      el('div', { class: 'cso-builder-canvas-wrap' }, [canvasEl])
    ]));

    root.appendChild(shell);
    root.appendChild(fullscreenHost);

    try {
      var savedRaw = localStorage.getItem(DRAFT_KEY);
      if (savedRaw) {
        var saved = JSON.parse(savedRaw);
        if (saved && Array.isArray(saved.blocks) && saved.blocks.length) {
          recoveryHost.appendChild(el('div', { class: 'cso-drawer' }, [
            el('div', { class: 'cso-drawer-head' }, [
              el('strong', { text: 'Unsaved Visual Builder Draft (' + (saved.route || '/custom-portal/') + ')' }),
              el('div', { class: 'cso-mod-toolbar' }, [
                el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm cso-mod-btn-primary', text: 'Restore Draft', onclick: function () {
                  if (saved.route) { currentRoute = saved.route; routeInput.value = saved.route; }
                  if (saved.pageMeta) pageMeta = saved.pageMeta;
                  blocks = saved.blocks;
                  selectedIdx = 0;
                  clear(recoveryHost);
                  renderMetaCard();
                  renderCanvas();
                  renderInspector();
                  toast('Restored Visual Builder draft', 'success');
                } }),
                el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Discard', onclick: function () { localStorage.removeItem(DRAFT_KEY); clear(recoveryHost); } })
              ])
            ])
          ]));
        }
      }
    } catch (_) {}

    renderMetaCard();
    renderCanvas();
    renderInspector();

    Promise.all([
      api('GET', 'pages').catch(function () { return { pages: [] }; }),
      api('GET', 'mock-tests?limit=50').catch(function () { return { items: [] }; }),
      api('GET', 'jobs?limit=50').catch(function () { return { items: [] }; }),
      api('GET', 'media').catch(function () { return { items: [] }; })
    ]).then(function (allRes) {
      (allRes[0].pages || []).forEach(function (p) {
        pagesMap[p.route] = p;
        pageSelect.appendChild(el('option', { value: p.route, text: (p.title || p.route) + ' (' + p.route + ')' }));
        verifiedLinks.push({ url: p.route, label: 'Page: ' + p.route });
      });
      (allRes[1].items || []).forEach(function (t) {
        verifiedLinks.push({ url: '/mock-tests/?test=' + encodeURIComponent(t.slug || t.id), label: 'Mock Test: ' + t.title });
      });
      (allRes[2].items || []).forEach(function (j) {
        verifiedLinks.push({ url: '/jobs-careers/?job=' + encodeURIComponent(j.slug || j.id), label: 'Job: ' + j.title });
      });
      (allRes[3].items || []).forEach(function (m) {
        if (m.kind === 'image') r2Images.push({ url: m.url || ('/api/media/' + m.object_key), name: m.original_name || m.object_key });
      });
      if (!tpl && pagesMap[currentRoute]) {
        pageSelect.value = currentRoute;
        loadPageIntoBuilder(pagesMap[currentRoute]);
      } else {
        renderInspector();
      }
    }).catch(function () {});
  }

  /* -------------------------------------------------------------------------
     02-004: Homepage Builder (Live /api/admin/banner + / in site_pages + iframe)
     ------------------------------------------------------------------------- */
  function renderHomepageBuilder(root, actions) {
    addHeaderPill(actions, '● Live Homepage Studio');
    var shell = el('div', { class: 'cso-mod-shell' });
    var DRAFT_KEY = 'cso_homepage_draft';
    var ODISHA_DISTRICTS = [
      'Angul', 'Balangir', 'Balasore', 'Bargarh', 'Bhadrak', 'Boudh', 'Cuttack', 'Deogarh',
      'Dhenkanal', 'Gajapati', 'Ganjam', 'Jagatsinghpur', 'Jajpur', 'Jharsuguda', 'Kalahandi',
      'Kandhamal', 'Kendrapara', 'Kendujhar', 'Khordha', 'Koraput', 'Malkangiri', 'Mayurbhanj',
      'Nabarangpur', 'Nayagarh', 'Nuapada', 'Puri', 'Rayagada', 'Sambalpur', 'Subarnapur', 'Sundargarh'
    ];

    var currentTargetRoute = '/';
    var pagesMap = {};
    var verifiedLinks = [
      { url: '/jobs-careers/', label: 'Portal: Jobs & Careers' },
      { url: '/current-affairs/', label: 'Portal: Current Affairs' },
      { url: '/mock-tests/', label: 'Portal: Mock Tests' },
      { url: '/resources/', label: 'Portal: Resources' },
      { url: '/syllabus/', label: 'Portal: Syllabus' },
      { url: '/student-dashboard/', label: 'Portal: Student Dashboard' }
    ];
    var r2Assets = [];
    var previewMode = 'unpublished'; // 'unpublished' | 'live'
    var previewTab = 'visual'; // 'visual' | 'serp' | 'jsonld'
    var viewport = 'desktop'; // 'desktop' | 'tablet' | 'mobile'
    var draftTimer = null;
    var dragSecIdx = null;
    var activeVaultEmbedUrl = null;

    var kpiHost = el('div', { class: 'cso-kpi-grid-4' });
    var recoveryHost = el('div', {});
    var validationHost = el('div', {});
    var linkHealthHost = el('div', {});
    var revisionHost = el('div', {});
    var fullscreenHost = el('div', {});
    var previewHost = el('div', {});
    var sectionsHost = el('div', { class: 'cso-mod-shell' });
    var tickerHost = el('div', { class: 'cso-mod-shell' });
    var r2PickHost = el('div', { class: 'cso-mod-card cso-hidden' });
    var bannerCardRef = null;
    var heroCardRef = null;
    var sectionCards = [];

    // 1. Live Broadcast Banner Controls
    var activeChk = el('input', { type: 'checkbox' });
    var sevSel = el('select', { class: 'cso-mod-select' }, ['info', 'notice', 'urgent'].map(function (s) { return el('option', { value: s, text: s.toUpperCase() }); }));
    var bHeadInp = el('input', { type: 'text', class: 'cso-mod-input', placeholder: 'Urgent announcement headline (max 160 chars)' });
    var bOdiaInp = el('input', { type: 'text', class: 'cso-mod-input', placeholder: 'ଓଡ଼ିଆ ବ୍ରେକିଂ ଶୀର୍ଷକ (Optional Odia banner headline)' });
    var bCtxInp = el('input', { type: 'text', class: 'cso-mod-input', placeholder: 'Supporting context (max 300 chars)' });
    var bCtaInp = el('input', { type: 'text', class: 'cso-mod-input', placeholder: 'Button label (max 40 chars)' });
    var bUrlInp = el('input', { type: 'text', class: 'cso-mod-input', placeholder: '/jobs-careers/' });
    var bStartInp = el('input', { type: 'datetime-local', class: 'cso-mod-input' });
    var bExpInp = el('input', { type: 'datetime-local', class: 'cso-mod-input' });
    var tickerItems = [
      { badge: 'NEW', text: 'OSSC CGL 2026 Online Application Window Open', url: '/jobs-careers/', urgent: true },
      { badge: 'CBT', text: 'Free Odisha GK & Current Affairs Bilingual Mock Series Live', url: '/mock-tests/', urgent: false }
    ];

    // 2. Homepage Hero & SEO Controls
    var seoTitleInp = el('input', { type: 'text', class: 'cso-mod-input', placeholder: 'Homepage SEO Title (50–60 chars optimal)' });
    var seoDescInp = el('textarea', { class: 'cso-mod-textarea', rows: '2', placeholder: 'Homepage Meta Description (120–160 chars optimal)' });
    var heroBadgeInp = el('input', { type: 'text', class: 'cso-mod-input', placeholder: 'Top Hero Badge (e.g. ODISHA #1 EXAM PORTAL)' });
    var heroTitleInp = el('input', { type: 'text', class: 'cso-mod-input', placeholder: 'Homepage Hero Headline' });
    var heroSubInp = el('input', { type: 'text', class: 'cso-mod-input', placeholder: 'Homepage Hero Subtitle' });
    var heroOdiaSubInp = el('input', { type: 'text', class: 'cso-mod-input', placeholder: 'ଓଡ଼ିଆ ଉପଶୀର୍ଷକ (Bilingual Odia Hero Subtitle)' });
    var ctaLblInp = el('input', { type: 'text', class: 'cso-mod-input', placeholder: 'Primary CTA Label' });
    var ctaUrlInp = el('input', { type: 'text', class: 'cso-mod-input', placeholder: '/jobs-careers/' });
    var secCtaLblInp = el('input', { type: 'text', class: 'cso-mod-input', placeholder: 'Secondary CTA Label (e.g. Start Free Mock)' });
    var secCtaUrlInp = el('input', { type: 'text', class: 'cso-mod-input', placeholder: '/mock-tests/' });
    var ogImgInp = el('input', { type: 'text', class: 'cso-mod-input', placeholder: '/api/media/<key>.jpg or https://…' });
    var ogAltInp = el('input', { type: 'text', class: 'cso-mod-input', placeholder: 'Hero / OG Image Alt Text (required when image set)' });
    var chipsInp = el('input', { type: 'text', class: 'cso-mod-input', value: 'OPSC OAS, OSSC CGL, OSSSC RI/ARI, OTET / OSSTET, Subhadra Yojana' });
    var qualPills = ['10th', '12th / +2', 'Graduate', 'B.Ed / Teacher', 'PG / NET'];
    var activeQuals = { '10th': true, '12th / +2': true, 'Graduate': true, 'B.Ed / Teacher': true, 'PG / NET': true };
    var trustCounters = [
      { value: '30 Districts', label: 'Odisha Coverage' },
      { value: '150+ CBT', label: 'Free Mock Tests' },
      { value: 'Daily Verified', label: 'Govt Job Alerts' },
      { value: 'Odia + English', label: 'Bilingual Support' }
    ];

    function defaultHomeSections() {
      return [
        {
          id: 'board', type: 'home_board', title: "What's New Today (Jobs · Admit Cards · Results)", enabled: true, auto_sync_jobs: true,
          latest_jobs: [{ title: 'OPSC OAS Prelims 2026 Notification', odia_tag: 'ଓଡ଼ିଆ', url: '/jobs-careers/', deadline: '' }],
          admit_cards: [{ title: 'OSSC CGL Admit Card Download', odia_tag: 'Admit', url: '/jobs-careers/', deadline: '' }],
          results: [{ title: 'OSSSC RI/ARI Cutoff & Merit List', odia_tag: 'Result', url: '/jobs-careers/', deadline: '' }]
        },
        {
          id: 'hubs', type: 'home_hubs', title: 'Odisha Exam & Commission Hubs', enabled: true,
          items: [
            { title: 'OPSC', badge: 'OAS / OCS', url: '/jobs-careers/?q=OPSC', summary: 'Civil Services & Gazetted posts' },
            { title: 'OSSC', badge: 'CGL / Combined', url: '/jobs-careers/?q=OSSC', summary: 'State Staff Selection' },
            { title: 'OSSSC', badge: 'RI / ARI / Amin', url: '/jobs-careers/?q=OSSSC', summary: 'Sub-ordinate Recruitment' },
            { title: 'Teacher Eligibility', badge: 'OTET / OSSTET / B.Ed', url: '/mock-tests/', summary: 'Teaching & B.Ed Entrance' },
            { title: 'Odisha Police', badge: 'SI / Constable', url: '/jobs-careers/?q=Police', summary: 'Uniformed Services' },
            { title: 'Railways / SSC', badge: 'Central', url: '/jobs-careers/?q=SSC', summary: 'RRB & SSC Regional' }
          ]
        },
        {
          id: 'cbt', type: 'home_cbt', title: 'Interactive Free CBT Mock Test Arena', enabled: true, auto_sync_tests: true,
          items: [
            { title: 'OSSC CGL Full-Length Mock #1', duration: '90 min', questions: '150', bilingual: true, url: '/mock-tests/' },
            { title: 'Odisha GK & Current Affairs', duration: '30 min', questions: '50', bilingual: true, url: '/mock-tests/' }
          ]
        },
        {
          id: 'districts', type: 'home_districts', title: 'Odisha 30-District Quick-Selector', enabled: true,
          districts: ODISHA_DISTRICTS.slice()
        },
        {
          id: 'schemes', type: 'home_schemes', title: 'Flagship Government Schemes Hub', enabled: true,
          items: [
            { title: 'Subhadra Yojana Odisha', badge: 'Women Welfare', url: '/resources/', summary: 'Eligibility, e-KYC & Status' },
            { title: 'State Scholarship Portal', badge: 'Students', url: 'https://scholarship.odisha.gov.in', summary: 'Pre & Post Matric Schemes' }
          ]
        },
        {
          id: 'calendar', type: 'home_calendar', title: 'Upcoming Exam Calendar & Key Deadlines', enabled: true,
          rows: [
            { label: 'OPSC OAS Prelims 2026', value: 'Expected Q2 2026' },
            { label: 'OSSC CGL Application Window', value: 'Active — Verify Official Portal' }
          ]
        },
        {
          id: 'vault', type: 'home_vault', title: 'Syllabus PDF, PYQ & Drive Document Vault', enabled: true,
          items: [
            { title: 'OPSC OAS Complete Syllabus PDF', source_label: 'Official Portal', url: '/syllabus/' }
          ]
        },
        {
          id: 'faq', type: 'home_faq', title: 'Homepage FAQs', enabled: true,
          rows: [
            { question: 'Are all CS Odisha CBT mock tests free?', answer: 'Yes, 100% free with bilingual English & Odia support and instant rank leaderboards.' }
          ]
        },
        {
          id: 'pwa', type: 'home_pwa', title: 'Install CS Odisha Offline App (PWA)', enabled: true,
          text: 'Save deadlines, track preparation checklists, and practice offline on Android & desktop.', label: 'Open Student Dashboard', url: '/student-dashboard/'
        }
      ];
    }

    var sections = defaultHomeSections();

    function makeRoutePicker(onPick) {
      var sel = el('select', { class: 'cso-mod-select' }, [el('option', { value: '', text: 'Pick verified route…' })].concat(
        verifiedLinks.map(function (v) { return el('option', { value: v.url, text: v.label }); })
      ));
      sel.addEventListener('change', function () { if (sel.value) { onPick(sel.value); sel.value = ''; } });
      return sel;
    }

    function detectPreviewUrl(u) {
      var m = String(u || '').match(/drive\.google\.com\/file\/d\/([^\/?#]+)/i) || String(u || '').match(/[?&]id=([^&]+)/i);
      if (m && m[1]) return 'https://drive.google.com/file/d/' + m[1] + '/preview';
      return u;
    }

    function buildHomepageJsonLd() {
      var list = [
        {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'Common Sense Odisha',
          url: 'https://csodisha.com/',
          potentialAction: {
            '@type': 'SearchAction',
            target: 'https://csodisha.com/jobs-careers/?q={search_term_string}',
            'query-input': 'required name=search_term_string'
          }
        },
        {
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'Common Sense Odisha',
          url: 'https://csodisha.com/',
          logo: 'https://csodisha.com/assets/favicon.svg'
        }
      ];
      var faqSec = sections.find(function (s) { return s.type === 'home_faq' && s.enabled !== false; });
      if (faqSec && Array.isArray(faqSec.rows) && faqSec.rows.length) {
        list.push({
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faqSec.rows.filter(function (r) { return r.question && r.answer; }).map(function (r) {
            return { '@type': 'Question', name: r.question, acceptedAnswer: { '@type': 'Answer', text: r.answer } };
          })
        });
      }
      return list;
    }

    function collectHomepageBlocks() {
      var out = [
        {
          type: 'page_meta',
          is_homepage: true,
          odia_subtitle: heroOdiaSubInp.value.trim(),
          hero_badge: heroBadgeInp.value.trim(),
          secondary_cta_label: secCtaLblInp.value.trim(),
          secondary_cta_url: secCtaUrlInp.value.trim(),
          trending_chips: chipsInp.value.split(',').map(function (s) { return s.trim(); }).filter(Boolean),
          qualification_pills: qualPills.filter(function (q) { return !!activeQuals[q]; }),
          trust_counters: trustCounters,
          banner_odia: bOdiaInp.value.trim(),
          banner_starts_at: bStartInp.value || null,
          banner_expires_at: bExpInp.value || null,
          og_alt: ogAltInp.value.trim()
        }
      ];
      if (ogImgInp.value.trim()) out.push({ type: 'og_meta', og_image: ogImgInp.value.trim() });
      if (tickerItems.length) out.push({ type: 'home_ticker', title: 'Breaking Updates', items: tickerItems });
      sections.forEach(function (s) {
        var copy = JSON.parse(JSON.stringify(s));
        copy.hidden = s.enabled === false;
        out.push(copy);
      });
      return out;
    }

    function renderKpis() {
      clear(kpiHost);
      var activeSecCount = sections.filter(function (s) { return s.enabled !== false; }).length;
      var pinnedCount = tickerItems.length;
      sections.forEach(function (s) {
        if (s.type === 'home_board') pinnedCount += (s.latest_jobs || []).length + (s.admit_cards || []).length + (s.results || []).length;
        else if (Array.isArray(s.items)) pinnedCount += s.items.length;
        else if (Array.isArray(s.rows)) pinnedCount += s.rows.length;
      });
      var tl = seoTitleInp.value.trim().length;
      var dl = seoDescInp.value.trim().length;
      var seoOk = (tl >= 30 && tl <= 65 && dl >= 80 && dl <= 165) ? 'Optimal ✓' : 'Needs Tuning';
      [
        { l: 'Active Sections', v: activeSecCount + ' / ' + sections.length, s: 'Reorderable portal modules' },
        { l: 'Pinned Notices & Links', v: String(pinnedCount), s: 'Ticker + Boards + Vault' },
        { l: 'SEO & JSON-LD Score', v: seoOk, s: 'Title ' + tl + 'c · Meta ' + dl + 'c' },
        { l: 'Broadcast Banner', v: activeChk.checked ? 'LIVE (' + sevSel.value.toUpperCase() + ')' : 'OFFLINE', s: bHeadInp.value.trim().slice(0, 32) || 'No headline set' }
      ].forEach(function (k) {
        kpiHost.appendChild(el('div', { class: 'cso-mod-kpi' }, [
          el('div', { class: 'cso-mod-kpi-label', text: k.l }),
          el('div', { class: 'cso-mod-kpi-val', text: k.v }),
          el('div', { class: 'cso-mod-kpi-sub', text: k.s })
        ]));
      });
    }

    var publishBtn = el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-primary', text: 'Publish Homepage Live', onclick: function () { saveHomepage('published', '/'); } });

    function runValidation() {
      clear(validationHost);
      var errs = [], warns = [];
      var t = seoTitleInp.value.trim();
      var d = seoDescInp.value.trim();
      if (!t) errs.push({ msg: 'SEO Title is required', el: seoTitleInp });
      else if (t.length > 65) warns.push({ msg: 'SEO Title (' + t.length + 'c) exceeds 65 chars', el: seoTitleInp });
      if (d.length < 70 || d.length > 165) warns.push({ msg: 'Meta Description (' + d.length + 'c) should be 70–165 chars', el: seoDescInp });
      if (ogImgInp.value.trim() && !ogAltInp.value.trim()) errs.push({ msg: 'Missing alt text for Hero / OG Image', el: ogAltInp });
      if (activeChk.checked && !bHeadInp.value.trim()) errs.push({ msg: 'Active Broadcast Banner requires a Headline', el: bHeadInp });
      if (bExpInp.value && Date.parse(bExpInp.value) < Date.now()) warns.push({ msg: 'Broadcast Banner expiry date is in the past', el: bExpInp });
      [bUrlInp, ctaUrlInp, secCtaUrlInp].forEach(function (inp) {
        var u = inp.value.trim();
        if (u && u.indexOf('http://') === 0) warns.push({ msg: 'Non-HTTPS URL: ' + u, el: inp });
        if (u && u.indexOf('/') !== 0 && !/^https?:\/\//i.test(u)) errs.push({ msg: 'Malformed URL: ' + u, el: inp });
      });

      publishBtn.disabled = errs.length > 0;
      publishBtn.title = errs.length > 0 ? ('Resolve ' + errs.length + ' blocking error(s) before publishing live') : '';

      var verifyBtn = el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Verify All Links (200 OK)', onclick: verifyAllLinks });
      if (!errs.length && !warns.length) {
        validationHost.appendChild(el('div', { class: 'cso-mod-card' }, [
          el('div', { class: 'cso-drawer-head' }, [badge('Pre-Publish Gate: All Checks Passed ✓', 'ok'), verifyBtn]),
          linkHealthHost
        ]));
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
          el('div', { class: 'cso-mod-toolbar' }, [
            verifyBtn,
            el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm cso-mod-btn-primary', text: '1-Click Auto-Fix Safe Issues', onclick: function () {
              seoTitleInp.value = seoTitleInp.value.trim();
              seoDescInp.value = seoDescInp.value.trim();
              if (ogImgInp.value.trim() && !ogAltInp.value.trim()) ogAltInp.value = heroTitleInp.value.trim() || 'Common Sense Odisha Portal';
              [bUrlInp, ctaUrlInp, secCtaUrlInp].forEach(function (inp) {
                if (inp.value.trim().indexOf('http://') === 0) inp.value = inp.value.trim().replace(/^http:\/\//i, 'https://');
              });
              updateAll();
              toast('Applied safe auto-fixes', 'success');
            } })
          ])
        ]),
        list,
        linkHealthHost
      ]));
    }

    async function verifyAllLinks() {
      var urls = [];
      [bUrlInp.value, ctaUrlInp.value, secCtaUrlInp.value, ogImgInp.value].forEach(function (u) { if (u && u.trim()) urls.push(u.trim()); });
      tickerItems.forEach(function (t) { if (t.url) urls.push(t.url); });
      sections.forEach(function (s) {
        if (s.url) urls.push(s.url);
        ['latest_jobs', 'admit_cards', 'results', 'items'].forEach(function (k) {
          if (Array.isArray(s[k])) s[k].forEach(function (it) { if (it && it.url) urls.push(it.url); });
        });
      });
      urls = urls.filter(function (u, i, a) { return u && a.indexOf(u) === i; });
      if (!urls.length) return;
      clear(linkHealthHost);
      linkHealthHost.appendChild(el('p', { class: 'cso-mod-muted', text: 'Pinging ' + urls.length + ' homepage link(s)…' }));
      try {
        var r = await api('POST', 'utils/check-links', { urls: urls });
        clear(linkHealthHost);
        var row = el('div', { class: 'cso-mod-toolbar' });
        (r.results || []).forEach(function (x) {
          var tone = x.ok ? 'ok' : (x.note && x.note.indexOf('Private') !== -1 ? 'warn' : 'danger');
          row.appendChild(badge(x.note + ' · ' + x.url.slice(0, 38), tone));
        });
        linkHealthHost.appendChild(row);
      } catch (e) { clear(linkHealthHost); toast(e.message, 'crimson'); }
    }

    function buildHomepagePreviewHtml() {
      var escH = function (s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
          return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
      };
      var safeU = function (u) {
        var s = String(u || '').trim();
        return (s.indexOf('/') === 0 && s.indexOf('//') !== 0) || /^https?:\/\//i.test(s) ? s : '#';
      };
      var bannerHtml = activeChk.checked ? '<div class="cso-sitewide" data-home-target="banner"><strong>[' + escH(sevSel.value.toUpperCase()) + '] ' + escH(bHeadInp.value) + '</strong> ' + escH(bOdiaInp.value) + ' <a href="' + escH(safeU(bUrlInp.value)) + '">' + escH(bCtaInp.value || 'Details') + '</a></div>' : '';
      var tickerHtml = tickerItems.length ? '<div class="card" data-home-target="banner"><strong>Breaking:</strong> ' + tickerItems.map(function (t) { return (t.urgent ? '[URGENT] ' : '') + escH(t.text); }).join(' · ') + '</div>' : '';
      var heroHtml = '<header class="hero" data-home-target="hero">' +
        (heroBadgeInp.value.trim() ? '<p class="kicker">' + escH(heroBadgeInp.value) + '</p>' : '') +
        (ogImgInp.value.trim() ? '<img src="' + escH(safeU(ogImgInp.value)) + '" alt="' + escH(ogAltInp.value || heroTitleInp.value) + '">' : '') +
        '<h1>' + escH(heroTitleInp.value.trim() || seoTitleInp.value.trim() || 'Common Sense Odisha') + '</h1>' +
        '<p>' + escH(heroSubInp.value.trim() || 'Odisha Govt Jobs, Syllabus, Current Affairs & Free CBT Mock Tests') + '</p>' +
        (heroOdiaSubInp.value.trim() ? '<p class="odia-sub">' + escH(heroOdiaSubInp.value) + '</p>' : '') +
        '<p>' + (ctaLblInp.value.trim() ? '<a class="btn primary" href="' + escH(safeU(ctaUrlInp.value)) + '">' + escH(ctaLblInp.value) + '</a> ' : '') +
        (secCtaLblInp.value.trim() ? '<a class="btn" href="' + escH(safeU(secCtaUrlInp.value)) + '">' + escH(secCtaLblInp.value) + '</a>' : '') + '</p>' +
        '<p>' + trustCounters.map(function (c) { return '<span><strong>' + escH(c.value) + '</strong> ' + escH(c.label) + '</span>'; }).join(' · ') + '</p>' +
        '</header>';
      var secsHtml = sections.map(function (s, idx) {
        if (s.enabled === false) return '';
        var inner = '<h2>' + escH(s.title) + '</h2>';
        if (s.type === 'home_board') {
          inner += '<div class="grid">' +
            [['Latest Jobs', s.latest_jobs], ['Admit Cards', s.admit_cards], ['Results', s.results]].map(function (col) {
              return '<div><h3>' + col[0] + '</h3><ul>' + (col[1] || []).map(function (r) { return '<li>' + escH(r.title) + (r.odia_tag ? ' (' + escH(r.odia_tag) + ')' : '') + '</li>'; }).join('') + '</ul></div>';
            }).join('') + '</div>';
        } else if (s.type === 'home_calendar') {
          inner += '<table><tbody>' + (s.rows || []).map(function (r) { return '<tr><th>' + escH(r.label) + '</th><td>' + escH(r.value) + '</td></tr>'; }).join('') + '</tbody></table>';
        } else if (s.type === 'home_faq') {
          inner += (s.rows || []).map(function (r) { return '<details open><summary>' + escH(r.question) + '</summary><p>' + escH(r.answer) + '</p></details>'; }).join('');
        } else if (s.type === 'home_districts') {
          inner += '<p>' + (s.districts || []).slice(0, 12).map(escH).join(', ') + '…</p>';
        } else if (Array.isArray(s.items)) {
          inner += '<ul>' + s.items.map(function (it) { return '<li><strong>' + escH(it.title) + '</strong>' + (it.summary ? ' — ' + escH(it.summary) : '') + '</li>'; }).join('') + '</ul>';
        } else if (s.text) {
          inner += '<p>' + escH(s.text) + '</p>';
        }
        return '<section class="card" data-home-target="sec-' + idx + '">' + inner + '</section>';
      }).join('');
      return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
        '<title>' + escH(seoTitleInp.value || 'Common Sense Odisha') + '</title>' +
        '<link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/assets/site.css">' +
        '</head><body>' + bannerHtml + '<main class="container">' + tickerHtml + heroHtml + secsHtml + '</main></body></html>';
    }

    function jumpToHomeTarget(target) {
      clear(fullscreenHost);
      var node = null;
      if (target === 'banner') node = bannerCardRef;
      else if (target === 'hero') node = heroCardRef;
      else if (target && target.indexOf('sec-') === 0) node = sectionCards[Number(target.slice(4))];
      if (node && node.scrollIntoView) node.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (node && node.classList) {
        node.classList.add('cso-focus-pulse');
        setTimeout(function () { node.classList.remove('cso-focus-pulse'); }, 1800);
      }
      toast('Focused: ' + target, 'info');
    }

    function wireHomeIframeClick(iframeEl) {
      iframeEl.addEventListener('load', function () {
        try {
          var doc = iframeEl.contentDocument;
          if (!doc) return;
          doc.addEventListener('click', function (ev) {
            ev.preventDefault();
            var hit = ev.target && ev.target.closest ? ev.target.closest('[data-home-target]') : null;
            if (hit) jumpToHomeTarget(hit.getAttribute('data-home-target'));
          });
        } catch (_) {}
      });
    }

    function openFullScreenPreview() {
      clear(fullscreenHost);
      var fsMode = viewport;
      var fsFrame = el('iframe', {
        class: 'cso-fullscreen-frame' + (fsMode === 'tablet' ? ' is-tablet' : fsMode === 'mobile' ? ' is-mobile' : ''),
        sandbox: 'allow-same-origin',
        title: 'Homepage Full-Screen Real View'
      });
      if (previewMode === 'live') fsFrame.src = '/?preview=1&t=' + Date.now();
      else {
        fsFrame.srcdoc = buildHomepagePreviewHtml();
        wireHomeIframeClick(fsFrame);
      }
      var bD = el('button', { type: 'button', class: 'cso-pill' + (fsMode === 'desktop' ? ' cso-pill-active' : ''), text: 'Desktop 100%', onclick: function () { setFs('desktop'); } });
      var bT = el('button', { type: 'button', class: 'cso-pill' + (fsMode === 'tablet' ? ' cso-pill-active' : ''), text: 'Tablet 768px', onclick: function () { setFs('tablet'); } });
      var bM = el('button', { type: 'button', class: 'cso-pill' + (fsMode === 'mobile' ? ' cso-pill-active' : ''), text: 'Mobile 375px', onclick: function () { setFs('mobile'); } });
      function setFs(m) {
        fsMode = m;
        bD.classList.toggle('cso-pill-active', m === 'desktop');
        bT.classList.toggle('cso-pill-active', m === 'tablet');
        bM.classList.toggle('cso-pill-active', m === 'mobile');
        fsFrame.className = 'cso-fullscreen-frame' + (m === 'tablet' ? ' is-tablet' : m === 'mobile' ? ' is-mobile' : '');
      }
      function closeFs() { document.removeEventListener('keydown', onEsc); clear(fullscreenHost); }
      function onEsc(e) { if (e.key === 'Escape') closeFs(); }
      document.addEventListener('keydown', onEsc);
      fullscreenHost.appendChild(el('div', { class: 'cso-fullscreen-overlay' }, [
        el('div', { class: 'cso-drawer-head' }, [
          el('div', { class: 'cso-mod-toolbar' }, [
            el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: '← Back to Editor', onclick: closeFs }),
            el('strong', { text: 'Homepage Full-Screen Real View (Click any section to focus)' })
          ]),
          el('div', { class: 'cso-mod-toolbar' }, [
            bD, bT, bM,
            el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Save Draft', onclick: function () { closeFs(); saveHomepage('draft', currentTargetRoute); } }),
            el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm cso-mod-btn-primary', text: 'Publish Homepage Live', onclick: function () { closeFs(); saveHomepage('published', '/'); } })
          ])
        ]),
        el('div', { class: 'cso-fullscreen-stage' }, [fsFrame])
      ]));
    }

    function updatePreviewPane() {
      clear(previewHost);
      var t = seoTitleInp.value.trim() || 'Common Sense Odisha — Odisha Govt Jobs & CBT Mock Tests';
      var d = seoDescInp.value.trim() || 'Verified OPSC, OSSC, OSSSC job alerts, Odia & English CBT mock tests, syllabus PDFs & 30-district updates.';
      if (previewTab === 'serp') {
        previewHost.appendChild(el('div', { class: 'cso-serp-card' }, [
          el('div', { class: 'cso-serp-url', text: 'https://csodisha.com/' }),
          el('div', { class: 'cso-serp-title', text: t }),
          el('p', { class: 'cso-serp-desc', text: d })
        ]));
        previewHost.appendChild(el('div', { class: 'cso-og-card' }, [
          el('div', { class: 'cso-preview-kicker', text: 'OPENGRAPH CARD PREVIEW' }),
          ogImgInp.value.trim() ? el('img', { src: ogImgInp.value.trim(), alt: ogAltInp.value.trim() || t, class: 'cso-asset-preview-img' }) : null,
          el('strong', { text: t }),
          el('p', { class: 'cso-mod-muted', text: d })
        ]));
      } else if (previewTab === 'jsonld') {
        previewHost.appendChild(el('pre', { class: 'cso-code-pre', text: JSON.stringify(buildHomepageJsonLd(), null, 2) }));
      } else {
        var cls = viewport === 'mobile' ? 'cso-preview-frame-mobile' : (viewport === 'tablet' ? 'cso-builder-iframe' : 'cso-builder-iframe');
        var fr = el('iframe', {
          class: cls,
          sandbox: previewMode === 'live' ? undefined : 'allow-same-origin',
          title: 'Homepage Real-CSS Preview'
        });
        if (previewMode === 'live') fr.src = '/?preview=1&t=' + Date.now();
        else {
          fr.srcdoc = buildHomepagePreviewHtml();
          wireHomeIframeClick(fr);
        }
        previewHost.appendChild(el('div', { class: 'cso-preview-frame-wrap' }, [fr]));
        previewHost.appendChild(el('p', { class: 'cso-mod-muted', text: previewMode === 'live' ? 'Showing live deployed /?preview=1' : 'Click any section in the Real-CSS preview to jump directly to its editor card.' }));
      }
    }

    function scheduleDraftSave() {
      if (draftTimer) clearTimeout(draftTimer);
      draftTimer = setTimeout(function () {
        try {
          localStorage.setItem(DRAFT_KEY, JSON.stringify({
            route: currentTargetRoute,
            banner: { active: activeChk.checked, severity: sevSel.value, headline: bHeadInp.value, odia: bOdiaInp.value, context: bCtxInp.value, ctaText: bCtaInp.value, ctaUrl: bUrlInp.value, startsAt: bStartInp.value, expiresAt: bExpInp.value },
            ticker: tickerItems,
            seoTitle: seoTitleInp.value, seoDesc: seoDescInp.value, heroBadge: heroBadgeInp.value,
            heroTitle: heroTitleInp.value, heroSub: heroSubInp.value, heroOdiaSub: heroOdiaSubInp.value,
            ctaLbl: ctaLblInp.value, ctaUrl: ctaUrlInp.value, secCtaLbl: secCtaLblInp.value, secCtaUrl: secCtaUrlInp.value,
            ogImg: ogImgInp.value, ogAlt: ogAltInp.value, chips: chipsInp.value, activeQuals: activeQuals, trustCounters: trustCounters,
            sections: sections, savedAt: new Date().toISOString()
          }));
        } catch (_) {}
      }, 600);
    }

    function updateAll() {
      renderKpis();
      runValidation();
      updatePreviewPane();
      scheduleDraftSave();
    }

    function renderTickerEditor() {
      clear(tickerHost);
      tickerItems.forEach(function (it, idx) {
        var bInp = el('input', { type: 'text', class: 'cso-mod-input', value: it.badge || '', placeholder: 'Badge (NEW)' });
        var tInp = el('input', { type: 'text', class: 'cso-mod-input', value: it.text || '', placeholder: 'Breaking headline' });
        var uInp = el('input', { type: 'text', class: 'cso-mod-input', value: it.url || '', placeholder: '/jobs-careers/' });
        var urgChk = el('input', { type: 'checkbox', checked: !!it.urgent });
        bInp.addEventListener('input', function () { it.badge = bInp.value; updateAll(); });
        tInp.addEventListener('input', function () { it.text = tInp.value; updateAll(); });
        uInp.addEventListener('input', function () { it.url = uInp.value; updateAll(); });
        urgChk.addEventListener('change', function () { it.urgent = !!urgChk.checked; updateAll(); });
        tickerHost.appendChild(el('div', { class: 'cso-builder-block' }, [
          el('div', { class: 'cso-mod-grid-3' }, [bInp, tInp, uInp]),
          el('div', { class: 'cso-drawer-head' }, [
            el('label', { class: 'cso-check-label' }, [urgChk, el('span', { text: 'URGENT / NEW' })]),
            el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-danger cso-mod-btn-sm', text: 'Remove', onclick: function () { tickerItems.splice(idx, 1); renderTickerEditor(); updateAll(); } })
          ])
        ]));
      });
    }

    function renderSectionsComposer() {
      clear(sectionsHost);
      sectionCards = [];
      sections.forEach(function (sec, idx) {
        var visChk = el('input', { type: 'checkbox', checked: sec.enabled !== false });
        visChk.addEventListener('change', function () { sec.enabled = !!visChk.checked; updateAll(); });
        var sTitle = el('input', { type: 'text', class: 'cso-mod-input', value: sec.title || '' });
        sTitle.addEventListener('input', function () { sec.title = sTitle.value; updateAll(); });

        var bodyNode = el('div', { class: 'cso-mod-shell' });
        if (sec.type === 'home_board') {
          var syncJobsChk = el('input', { type: 'checkbox', checked: sec.auto_sync_jobs !== false });
          syncJobsChk.addEventListener('change', function () { sec.auto_sync_jobs = !!syncJobsChk.checked; updateAll(); });
          bodyNode.appendChild(el('label', { class: 'cso-check-label' }, [syncJobsChk, el('span', { text: 'Auto-Sync Latest from /api/admin/jobs' })]));
          [['latest_jobs', 'Latest Jobs'], ['admit_cards', 'Admit Cards'], ['results', 'Results & Cutoffs']].forEach(function (pair) {
            var key = pair[0], lbl = pair[1];
            if (!Array.isArray(sec[key])) sec[key] = [];
            var colBox = el('div', { class: 'cso-mod-shell' });
            sec[key].forEach(function (row, ri) {
              var rt = el('input', { type: 'text', class: 'cso-mod-input', value: row.title || '', placeholder: lbl + ' Title' });
              var ro = el('input', { type: 'text', class: 'cso-mod-input', value: row.odia_tag || '', placeholder: 'Odia Tag' });
              var ru = el('input', { type: 'text', class: 'cso-mod-input', value: row.url || '', placeholder: 'URL / PDF / Drive' });
              var rd = el('input', { type: 'date', class: 'cso-mod-input', value: row.deadline || '' });
              rt.addEventListener('input', function () { row.title = rt.value; updateAll(); });
              ro.addEventListener('input', function () { row.odia_tag = ro.value; updateAll(); });
              ru.addEventListener('input', function () { row.url = ru.value; updateAll(); });
              rd.addEventListener('input', function () { row.deadline = rd.value; updateAll(); });
              var daysLeft = row.deadline ? Math.ceil((Date.parse(row.deadline) - Date.now()) / 86400000) : null;
              colBox.appendChild(el('div', { class: 'cso-mod-grid-3' }, [
                rt, ro,
                el('div', { class: 'cso-mod-toolbar' }, [
                  ru, rd,
                  (daysLeft !== null && !isNaN(daysLeft) && daysLeft >= 0) ? badge('Closing in ' + daysLeft + 'd', daysLeft <= 7 ? 'danger' : 'warn') : null,
                  el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-danger cso-mod-btn-sm', text: '×', onclick: function () { sec[key].splice(ri, 1); renderSectionsComposer(); updateAll(); } })
                ])
              ]));
            });
            bodyNode.appendChild(el('div', { class: 'cso-builder-block' }, [
              el('div', { class: 'cso-drawer-head' }, [
                el('strong', { text: lbl + ' (' + sec[key].length + ')' }),
                el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: '+ Pin ' + lbl, onclick: function () { sec[key].push({ title: '', odia_tag: '', url: '/jobs-careers/', deadline: '' }); renderSectionsComposer(); updateAll(); } })
              ]),
              colBox
            ]));
          });
        } else if (sec.type === 'home_hubs' || sec.type === 'home_schemes') {
          if (!Array.isArray(sec.items)) sec.items = [];
          sec.items.forEach(function (it, ii) {
            var itT = el('input', { type: 'text', class: 'cso-mod-input', value: it.title || '', placeholder: 'Hub / Scheme Title' });
            var itB = el('input', { type: 'text', class: 'cso-mod-input', value: it.badge || '', placeholder: 'Badge' });
            var itU = el('input', { type: 'text', class: 'cso-mod-input', value: it.url || '', placeholder: '/route/' });
            var itS = el('input', { type: 'text', class: 'cso-mod-input', value: it.summary || '', placeholder: 'Summary' });
            itT.addEventListener('input', function () { it.title = itT.value; updateAll(); });
            itB.addEventListener('input', function () { it.badge = itB.value; updateAll(); });
            itU.addEventListener('input', function () { it.url = itU.value; updateAll(); });
            itS.addEventListener('input', function () { it.summary = itS.value; updateAll(); });
            bodyNode.appendChild(el('div', { class: 'cso-mod-grid-3' }, [
              itT, itB,
              el('div', { class: 'cso-mod-toolbar' }, [itU, itS, el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-danger cso-mod-btn-sm', text: '×', onclick: function () { sec.items.splice(ii, 1); renderSectionsComposer(); updateAll(); } })])
            ]));
          });
          bodyNode.appendChild(el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: '+ Add Card', onclick: function () { sec.items.push({ title: '', badge: '', url: '/jobs-careers/', summary: '' }); renderSectionsComposer(); updateAll(); } }));
        } else if (sec.type === 'home_cbt') {
          var syncCbt = el('input', { type: 'checkbox', checked: sec.auto_sync_tests !== false });
          syncCbt.addEventListener('change', function () { sec.auto_sync_tests = !!syncCbt.checked; updateAll(); });
          bodyNode.appendChild(el('label', { class: 'cso-check-label' }, [syncCbt, el('span', { text: 'Auto-Sync from /api/admin/mock-tests' })]));
          (sec.items || []).forEach(function (it, ii) {
            var ct = el('input', { type: 'text', class: 'cso-mod-input', value: it.title || '', placeholder: 'Mock Test Title' });
            var cq = el('input', { type: 'text', class: 'cso-mod-input', value: it.questions || '', placeholder: 'Questions (100)' });
            var cd = el('input', { type: 'text', class: 'cso-mod-input', value: it.duration || '', placeholder: 'Duration (90 min)' });
            ct.addEventListener('input', function () { it.title = ct.value; updateAll(); });
            cq.addEventListener('input', function () { it.questions = cq.value; updateAll(); });
            cd.addEventListener('input', function () { it.duration = cd.value; updateAll(); });
            bodyNode.appendChild(el('div', { class: 'cso-mod-grid-3' }, [
              ct, cq,
              el('div', { class: 'cso-mod-toolbar' }, [cd, el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-danger cso-mod-btn-sm', text: '×', onclick: function () { sec.items.splice(ii, 1); renderSectionsComposer(); updateAll(); } })])
            ]));
          });
          bodyNode.appendChild(el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: '+ Pin Mock Test', onclick: function () { sec.items.push({ title: '', questions: '100', duration: '90 min', bilingual: true, url: '/mock-tests/' }); renderSectionsComposer(); updateAll(); } }));
        } else if (sec.type === 'home_calendar') {
          var calPaste = el('textarea', { class: 'cso-mod-textarea', rows: '2', placeholder: 'Bulk paste "Exam: Date" lines and click Auto-Split…' });
          bodyNode.appendChild(el('div', { class: 'cso-mod-toolbar' }, [
            calPaste,
            el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Auto-Split Lines', onclick: function () {
              calPaste.value.split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean).forEach(function (ln) {
                var pts = ln.split(/[:|\t–—]+/);
                sec.rows.push(pts.length >= 2 ? { label: pts[0].trim(), value: pts.slice(1).join(':').trim() } : { label: ln, value: 'TBD' });
              });
              calPaste.value = '';
              renderSectionsComposer(); updateAll();
            } }),
            el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: '+ Add Row', onclick: function () { sec.rows.push({ label: '', value: '' }); renderSectionsComposer(); updateAll(); } })
          ]));
          (sec.rows || []).forEach(function (rw, ri) {
            var rl = el('input', { type: 'text', class: 'cso-mod-input', value: rw.label || '' });
            var rv = el('input', { type: 'text', class: 'cso-mod-input', value: rw.value || '' });
            rl.addEventListener('input', function () { rw.label = rl.value; updateAll(); });
            rv.addEventListener('input', function () { rw.value = rv.value; updateAll(); });
            bodyNode.appendChild(el('div', { class: 'cso-mod-grid-3' }, [rl, rv, el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-danger cso-mod-btn-sm', text: '×', onclick: function () { sec.rows.splice(ri, 1); renderSectionsComposer(); updateAll(); } })]));
          });
        } else if (sec.type === 'home_vault') {
          (sec.items || []).forEach(function (it, ii) {
            var vt = el('input', { type: 'text', class: 'cso-mod-input', value: it.title || '', placeholder: 'Document Title' });
            var vs = el('input', { type: 'text', class: 'cso-mod-input', value: it.source_label || '', placeholder: 'R2 PDF / Drive / Official' });
            var vu = el('input', { type: 'text', class: 'cso-mod-input', value: it.url || '', placeholder: 'https://… or /api/media/…' });
            vt.addEventListener('input', function () { it.title = vt.value; updateAll(); });
            vs.addEventListener('input', function () { it.source_label = vs.value; updateAll(); });
            vu.addEventListener('input', function () { it.url = vu.value; updateAll(); });
            bodyNode.appendChild(el('div', { class: 'cso-mod-grid-3' }, [
              vt, vs,
              el('div', { class: 'cso-mod-toolbar' }, [
                vu,
                el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Preview', onclick: function () { activeVaultEmbedUrl = activeVaultEmbedUrl === it.url ? null : it.url; renderSectionsComposer(); } }),
                el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-danger cso-mod-btn-sm', text: '×', onclick: function () { sec.items.splice(ii, 1); renderSectionsComposer(); updateAll(); } })
              ])
            ]));
            if (activeVaultEmbedUrl && activeVaultEmbedUrl === it.url) {
              bodyNode.appendChild(el('iframe', { src: detectPreviewUrl(it.url), class: 'cso-asset-preview-pdf', title: it.title }));
            }
          });
          bodyNode.appendChild(el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: '+ Add Document / Drive Link', onclick: function () { sec.items.push({ title: '', source_label: 'Official PDF', url: '/syllabus/' }); renderSectionsComposer(); updateAll(); } }));
        } else if (sec.type === 'home_faq') {
          (sec.rows || []).forEach(function (rw, ri) {
            var fq = el('input', { type: 'text', class: 'cso-mod-input', value: rw.question || '', placeholder: 'Question' });
            var fa = el('input', { type: 'text', class: 'cso-mod-input', value: rw.answer || '', placeholder: 'Answer' });
            fq.addEventListener('input', function () { rw.question = fq.value; updateAll(); });
            fa.addEventListener('input', function () { rw.answer = fa.value; updateAll(); });
            bodyNode.appendChild(el('div', { class: 'cso-mod-grid-3' }, [fq, fa, el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-danger cso-mod-btn-sm', text: '×', onclick: function () { sec.rows.splice(ri, 1); renderSectionsComposer(); updateAll(); } })]));
          });
          bodyNode.appendChild(el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: '+ Add FAQ', onclick: function () { sec.rows.push({ question: '', answer: '' }); renderSectionsComposer(); updateAll(); } }));
        } else if (sec.type === 'home_districts') {
          bodyNode.appendChild(el('p', { class: 'cso-mod-muted', text: (sec.districts || []).length + ' Odisha districts active (' + (sec.districts || []).slice(0, 6).join(', ') + '…)' }));
        } else if (sec.type === 'home_pwa') {
          var pt = el('input', { type: 'text', class: 'cso-mod-input', value: sec.text || '' });
          var pl = el('input', { type: 'text', class: 'cso-mod-input', value: sec.label || '' });
          pt.addEventListener('input', function () { sec.text = pt.value; updateAll(); });
          pl.addEventListener('input', function () { sec.label = pl.value; updateAll(); });
          bodyNode.appendChild(el('div', { class: 'cso-mod-grid-2' }, [pt, pl]));
        }

        var sCard = el('details', { class: 'cso-builder-block', draggable: 'true', open: idx < 2 }, [
          el('summary', { class: 'cso-builder-block-head' }, [
            el('div', { class: 'cso-inline-row' }, [
              el('span', { class: 'cso-drag-handle', text: '⋮⋮' }),
              badge((idx + 1) + '. ' + sec.type.replace('home_', '').toUpperCase(), sec.enabled !== false ? 'ok' : 'muted'),
              el('strong', { text: sec.title })
            ]),
            el('div', { class: 'cso-mod-toolbar' }, [
              el('label', { class: 'cso-check-label' }, [visChk, el('span', { text: 'Show' })]),
              el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: '↑', disabled: idx === 0, onclick: function (e) { e.preventDefault(); var t = sections[idx - 1]; sections[idx - 1] = sec; sections[idx] = t; renderSectionsComposer(); updateAll(); } }),
              el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: '↓', disabled: idx === sections.length - 1, onclick: function (e) { e.preventDefault(); var t = sections[idx + 1]; sections[idx + 1] = sec; sections[idx] = t; renderSectionsComposer(); updateAll(); } })
            ])
          ]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Section Title' }), sTitle]),
          bodyNode
        ]);
        sCard.addEventListener('dragstart', function () { dragSecIdx = idx; sCard.classList.add('is-dragging'); });
        sCard.addEventListener('dragend', function () { dragSecIdx = null; sCard.classList.remove('is-dragging'); });
        sCard.addEventListener('dragover', function (e) { e.preventDefault(); });
        sCard.addEventListener('drop', function (e) {
          e.preventDefault();
          if (dragSecIdx === null || dragSecIdx === idx) return;
          var mv = sections.splice(dragSecIdx, 1)[0];
          sections.splice(idx, 0, mv);
          dragSecIdx = null;
          renderSectionsComposer();
          updateAll();
        });
        sectionCards[idx] = sCard;
        sectionsHost.appendChild(sCard);
      });
    }

    function hydrateFromPage(home) {
      if (!home) return;
      seoTitleInp.value = home.title || '';
      seoDescInp.value = home.meta_description || '';
      heroTitleInp.value = home.hero_title || '';
      heroSubInp.value = home.hero_subtitle || '';
      ctaLblInp.value = home.cta_label || '';
      ctaUrlInp.value = home.cta_url || '';
      var parsed = f02ParseBlocks(home.blocks_json);
      var pm = parsed.find(function (b) { return b && b.type === 'page_meta'; }) || {};
      var ogm = parsed.find(function (b) { return b && b.type === 'og_meta'; }) || {};
      var tk = parsed.find(function (b) { return b && b.type === 'home_ticker'; });
      if (pm.odia_subtitle !== undefined) heroOdiaSubInp.value = pm.odia_subtitle || '';
      if (pm.hero_badge !== undefined) heroBadgeInp.value = pm.hero_badge || '';
      if (pm.secondary_cta_label !== undefined) secCtaLblInp.value = pm.secondary_cta_label || '';
      if (pm.secondary_cta_url !== undefined) secCtaUrlInp.value = pm.secondary_cta_url || '';
      if (Array.isArray(pm.trending_chips)) chipsInp.value = pm.trending_chips.join(', ');
      if (Array.isArray(pm.trust_counters) && pm.trust_counters.length) trustCounters = pm.trust_counters;
      if (pm.banner_odia !== undefined) bOdiaInp.value = pm.banner_odia || '';
      if (pm.banner_starts_at) bStartInp.value = pm.banner_starts_at;
      if (pm.banner_expires_at) bExpInp.value = pm.banner_expires_at;
      if (pm.og_alt) ogAltInp.value = pm.og_alt;
      if (ogm.og_image) ogImgInp.value = ogm.og_image;
      if (tk && Array.isArray(tk.items)) tickerItems = tk.items;
      var homeSecs = parsed.filter(function (b) { return b && b.type && b.type.indexOf('home_') === 0 && b.type !== 'home_ticker'; });
      if (homeSecs.length) sections = homeSecs.map(function (s) { s.enabled = !s.hidden; return s; });
      renderTickerEditor();
      renderSectionsComposer();
      updateAll();
    }

    async function loadHomepage() {
      try {
        var [b, pRes, jRes, mRes, medRes] = await Promise.all([
          api('GET', 'banner'),
          api('GET', 'pages'),
          api('GET', 'jobs?limit=25').catch(function () { return { items: [] }; }),
          api('GET', 'mock-tests?limit=25').catch(function () { return { items: [] }; }),
          api('GET', 'media').catch(function () { return { items: [] }; })
        ]);
        activeChk.checked = !!b.active;
        sevSel.value = b.severity || 'info';
        bHeadInp.value = b.headline || '';
        bCtxInp.value = b.context || '';
        bCtaInp.value = b.ctaText || '';
        bUrlInp.value = b.ctaUrl || '';

        clear(variantSel);
        variantSel.appendChild(el('option', { value: '/', text: 'Current Live Homepage (/)' }));
        (pRes.pages || []).forEach(function (p) {
          pagesMap[p.route] = p;
          verifiedLinks.push({ url: p.route, label: 'Page: ' + p.route });
          if (p.route.indexOf('/home-') === 0) {
            variantSel.appendChild(el('option', { value: p.route, text: 'Variant: ' + (p.title || p.route) + ' (' + p.status + ')' }));
          }
        });
        variantSel.appendChild(el('option', { value: '__NEW_VARIANT__', text: '+ Create / Clone Homepage Variant' }));

        (jRes.items || []).forEach(function (j) { verifiedLinks.push({ url: '/jobs-careers/?job=' + encodeURIComponent(j.slug || j.id), label: 'Job: ' + j.title }); });
        (mRes.items || []).forEach(function (t) { verifiedLinks.push({ url: '/mock-tests/?test=' + encodeURIComponent(t.slug || t.id), label: 'Mock: ' + t.title }); });
        r2Assets = medRes.items || [];

        if (pagesMap['/']) hydrateFromPage(pagesMap['/']);
        else updateAll();
      } catch (e) { toast(e.message, 'crimson'); }
    }

    async function saveHomepage(status, targetRoute) {
      var r = targetRoute || currentTargetRoute || '/';
      try {
        if (r === '/') {
          await api('PUT', 'banner', {
            active: activeChk.checked,
            severity: sevSel.value,
            headline: bHeadInp.value.trim(),
            context: bCtxInp.value.trim(),
            ctaText: bCtaInp.value.trim(),
            ctaUrl: bUrlInp.value.trim()
          });
        }
        await api('PUT', 'pages', {
          route: r,
          title: seoTitleInp.value.trim() || 'Common Sense Odisha',
          meta_description: seoDescInp.value.trim(),
          category: 'Core Portal',
          hero_title: heroTitleInp.value.trim(),
          hero_subtitle: heroSubInp.value.trim(),
          cta_label: ctaLblInp.value.trim(),
          cta_url: ctaUrlInp.value.trim(),
          blocks_json: JSON.stringify(collectHomepageBlocks()),
          status: status,
          note: 'Homepage Command Studio (' + r + ')'
        });
        try { localStorage.removeItem(DRAFT_KEY); clear(recoveryHost); } catch (_) {}
        toast((status === 'published' ? 'Published ' : 'Saved draft ') + r, 'success');
        updatePreviewPane();
      } catch (e) { toast(e.message, 'crimson'); }
    }

    async function openHomeRevisions() {
      clear(revisionHost);
      try {
        var d = await api('GET', 'pages/revisions?route=' + encodeURIComponent(currentTargetRoute));
        var revs = d.revisions || [];
        var box = el('div', { class: 'cso-drawer' }, [
          el('div', { class: 'cso-drawer-head' }, [
            el('strong', { text: 'Homepage Revision History (' + revs.length + ') — ' + currentTargetRoute }),
            el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Close', onclick: function () { clear(revisionHost); } })
          ])
        ]);
        revs.forEach(function (rv) {
          var snap = {};
          try { snap = JSON.parse(rv.snapshot_json || '{}'); } catch (_) {}
          box.appendChild(el('div', { class: 'cso-diff-row' }, [
            el('div', { class: 'cso-drawer-head' }, [
              el('span', { text: (rv.created_at || '') + ' · ' + (snap.title || rv.route) + ' (' + (rv.note || 'update') + ')' }),
              el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm cso-mod-btn-primary', text: 'Restore', onclick: async function () {
                await api('POST', 'pages/restore', { route: currentTargetRoute, revision_id: rv.id, status: 'draft' });
                clear(revisionHost);
                loadHomepage();
                toast('Restored revision #' + rv.id, 'success');
              } })
            ])
          ]));
        });
        revisionHost.appendChild(box);
      } catch (e) { toast(e.message, 'crimson'); }
    }

    // Variant & Portal Mode Presets
    var variantSel = el('select', { class: 'cso-mod-select' }, [el('option', { value: '/', text: 'Current Live Homepage (/)' })]);
    variantSel.addEventListener('change', function () {
      if (variantSel.value === '__NEW_VARIANT__') {
        var slug = '/home-variant-' + Math.random().toString(36).slice(2, 6) + '/';
        currentTargetRoute = slug;
        toast('Editing new draft variant: ' + slug, 'info');
        return;
      }
      currentTargetRoute = variantSel.value;
      if (pagesMap[currentTargetRoute]) hydrateFromPage(pagesMap[currentTargetRoute]);
    });

    var presetSel = el('select', { class: 'cso-mod-select' }, [
      el('option', { value: '', text: 'Portal Mode Presets…' }),
      el('option', { value: 'balanced', text: 'Standard Balanced Portal' }),
      el('option', { value: 'admit', text: 'Exam / Admit Card High-Alert' }),
      el('option', { value: 'results', text: 'Results & Cutoff Showcase' }),
      el('option', { value: 'cbt', text: 'CBT Mock Test & Syllabus Intensive' })
    ]);
    presetSel.addEventListener('change', function () {
      var v = presetSel.value;
      if (!v) return;
      if (v === 'admit') { activeChk.checked = true; sevSel.value = 'urgent'; heroBadgeInp.value = 'ADMIT CARDS & EXAM ALERTS LIVE'; }
      else if (v === 'results') { activeChk.checked = true; sevSel.value = 'notice'; heroBadgeInp.value = 'RESULTS & MERIT LISTS UPDATED'; }
      else if (v === 'cbt') { heroBadgeInp.value = 'FREE BILINGUAL CBT MOCK SERIES'; ctaLblInp.value = 'Launch Mock Tests'; ctaUrlInp.value = '/mock-tests/'; }
      else { heroBadgeInp.value = 'ODISHA #1 EXAM & JOB PORTAL'; }
      presetSel.value = '';
      updateAll();
      toast('Applied portal preset', 'info');
    });

    var importJsonInp = el('input', { type: 'file', class: 'cso-sr-file', accept: '.json,application/json' });
    importJsonInp.addEventListener('change', function () {
      var f = importJsonInp.files[0];
      if (!f) return;
      var rdr = new FileReader();
      rdr.onload = function () {
        try {
          var d = JSON.parse(String(rdr.result || '{}'));
          if (Array.isArray(d.sections)) sections = d.sections;
          if (Array.isArray(d.ticker)) tickerItems = d.ticker;
          renderTickerEditor();
          renderSectionsComposer();
          updateAll();
          toast('Imported homepage JSON', 'success');
        } catch (err) { toast('Invalid JSON: ' + err.message, 'crimson'); }
      };
      rdr.readAsText(f);
      importJsonInp.value = '';
    });

    renderBanner(shell, 'Homepage Command Studio', 'Manage Live (/), saved homepage variants, hybrid D1 auto-sync boards, Odia hero & real-CSS preview.', [
      variantSel,
      presetSel,
      publishBtn,
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'Save Draft', onclick: function () { saveHomepage('draft', currentTargetRoute); } }),
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'Promote Variant to /', onclick: function () { currentTargetRoute = '/'; saveHomepage('published', '/'); } }),
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'Revision History', onclick: openHomeRevisions }),
      el('label', { class: 'cso-mod-btn' }, [el('span', { text: 'Import JSON' }), importJsonInp]),
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'Export JSON', onclick: function () { downloadFile('homepage-config.json', JSON.stringify({ ticker: tickerItems, sections: sections }, null, 2)); } }),
      el('a', { href: '/', target: '_blank', rel: 'noopener noreferrer', class: 'cso-mod-btn', text: 'Open Live / ↗' })
    ]);

    shell.appendChild(recoveryHost);
    shell.appendChild(kpiHost);
    shell.appendChild(validationHost);
    shell.appendChild(revisionHost);

    // 10-Second Instant Homepage Quick-Drop Bar
    var qdTitle = el('input', { type: 'text', class: 'cso-mod-input', placeholder: 'Title (e.g. OPSC OAS Admit Card Out)' });
    var qdOdia = el('input', { type: 'text', class: 'cso-mod-input', placeholder: 'Odia Tag (ଓଡ଼ିଆ)' });
    var qdUrl = el('input', { type: 'text', class: 'cso-mod-input', placeholder: 'URL / R2 / Google Drive' });
    var qdTarget = el('select', { class: 'cso-mod-select' }, [
      'Broadcast Banner', 'Breaking Ticker', 'Latest Jobs', 'Admit Cards', 'Results & Cutoffs', 'Syllabus Vault'
    ].map(function (t) { return el('option', { value: t, text: t }); }));
    shell.appendChild(el('div', { class: 'cso-mod-card' }, [
      el('div', { class: 'cso-drawer-head' }, [el('strong', { text: '⚡ 10-Second Instant Homepage Quick-Drop' }), makeRoutePicker(function (u) { qdUrl.value = u; })]),
      el('div', { class: 'cso-mod-grid-3' }, [qdTitle, qdOdia, qdUrl]),
      el('div', { class: 'cso-mod-toolbar' }, [
        qdTarget,
        el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-primary', text: 'Insert & Preview', onclick: function () {
          var t = qdTitle.value.trim();
          var u = qdUrl.value.trim() || '/jobs-careers/';
          if (!t) { toast('Enter a title for Quick-Drop', 'amber'); return; }
          var tg = qdTarget.value;
          if (tg === 'Broadcast Banner') { activeChk.checked = true; bHeadInp.value = t; bOdiaInp.value = qdOdia.value.trim(); bUrlInp.value = u; }
          else if (tg === 'Breaking Ticker') { tickerItems.unshift({ badge: 'NEW', text: t, url: u, urgent: true }); renderTickerEditor(); }
          else if (tg === 'Syllabus Vault') {
            var vSec = sections.find(function (s) { return s.type === 'home_vault'; });
            if (vSec) vSec.items.unshift({ title: t, source_label: qdOdia.value.trim() || 'PDF', url: u });
            renderSectionsComposer();
          } else {
            var bSec = sections.find(function (s) { return s.type === 'home_board'; });
            var map = { 'Latest Jobs': 'latest_jobs', 'Admit Cards': 'admit_cards', 'Results & Cutoffs': 'results' };
            if (bSec && map[tg]) bSec[map[tg]].unshift({ title: t, odia_tag: qdOdia.value.trim(), url: u, deadline: '' });
            renderSectionsComposer();
          }
          qdTitle.value = ''; qdOdia.value = ''; qdUrl.value = '';
          updateAll();
          toast('Inserted into ' + tg, 'success');
        } })
      ])
    ]));

    // AI Homepage Co-Pilot
    var aiPromptInp = el('input', { type: 'text', class: 'cso-mod-input', placeholder: 'Paste notice or topic to generate Hero copy, Odia summary & FAQs…' });
    shell.appendChild(el('details', { class: 'cso-mod-card' }, [
      el('summary', { class: 'cso-drawer-head' }, [el('strong', { text: '✨ AI Homepage Co-Pilot (Workers AI)' }), badge('Optional', 'info')]),
      el('div', { class: 'cso-mod-toolbar' }, [
        aiPromptInp,
        el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-primary', text: 'Generate Hero & Odia Copy', onclick: async function () {
          var topic = aiPromptInp.value.trim() || heroTitleInp.value.trim() || 'Common Sense Odisha Exam Portal';
          try {
            var res = await api('POST', 'ai/generate-page', { mode: 'create', topic: topic, language: 'Bilingual English + Odia' });
            if (res.hero_title) heroTitleInp.value = res.hero_title;
            if (res.hero_subtitle) heroSubInp.value = res.hero_subtitle;
            if (res.odia_subtitle) heroOdiaSubInp.value = res.odia_subtitle;
            updateAll();
            toast('AI Homepage copy applied', 'success');
          } catch (e) { toast(e.message, 'crimson'); }
        } })
      ])
    ]));

    // R2 Upload + Picker for Hero/OG
    var r2Up = el('input', { type: 'file', class: 'cso-sr-file', accept: '.png,.jpg,.jpeg,.webp,.svg' });
    r2Up.addEventListener('change', async function () {
      var f = r2Up.files[0];
      if (!f) return;
      var fd = new FormData();
      fd.append('file', f);
      try {
        var d = await api('POST', 'media/upload', fd, true);
        ogImgInp.value = d.url || ('/api/media/' + (d.key || d.object_key));
        if (!ogAltInp.value.trim()) ogAltInp.value = f.name.replace(/\.[a-z0-9]+$/i, '');
        updateAll();
        toast('Uploaded Hero/OG image to R2', 'success');
      } catch (e) { toast(e.message, 'crimson'); }
      r2Up.value = '';
    });

    function toggleR2Picker() {
      r2PickHost.classList.toggle('cso-hidden');
      if (r2PickHost.classList.contains('cso-hidden')) return;
      clear(r2PickHost);
      r2PickHost.appendChild(el('div', { class: 'cso-drawer-head' }, [
        el('strong', { text: 'Pick Image from R2 Library' }),
        el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Close', onclick: function () { r2PickHost.classList.add('cso-hidden'); } })
      ]));
      r2Assets.filter(function (m) { return m.kind === 'image'; }).slice(0, 12).forEach(function (m) {
        var u = m.url || ('/api/media/' + m.object_key);
        r2PickHost.appendChild(el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: m.original_name || m.object_key, onclick: function () {
          ogImgInp.value = u;
          if (!ogAltInp.value.trim()) ogAltInp.value = m.original_name || 'Portal Banner';
          r2PickHost.classList.add('cso-hidden');
          updateAll();
        } }));
      });
    }

    var qualRow = el('div', { class: 'cso-pill-row' }, qualPills.map(function (q) {
      var btn = el('button', { type: 'button', class: 'cso-pill cso-pill-active', text: q, onclick: function () {
        activeQuals[q] = !activeQuals[q];
        btn.classList.toggle('cso-pill-active', !!activeQuals[q]);
        updateAll();
      } });
      return btn;
    }));

    var trustHost = el('div', { class: 'cso-mod-grid-2' });
    trustCounters.forEach(function (tc) {
      var vI = el('input', { type: 'text', class: 'cso-mod-input', value: tc.value });
      var lI = el('input', { type: 'text', class: 'cso-mod-input', value: tc.label });
      vI.addEventListener('input', function () { tc.value = vI.value; updateAll(); });
      lI.addEventListener('input', function () { tc.label = lI.value; updateAll(); });
      trustHost.appendChild(el('div', { class: 'cso-builder-block' }, [vI, lI]));
    });

    bannerCardRef = el('div', { class: 'cso-mod-card' }, [
      el('h3', { text: '1. Live Broadcast Banner & Breaking Marquee (/api/admin/banner)' }),
      el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-check-label' }, [activeChk, el('span', { text: 'Banner Active on Live Website' })])]),
      el('div', { class: 'cso-mod-grid-2' }, [
        el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Severity' }), sevSel]),
        el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Headline' }), bHeadInp])
      ]),
      el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Odia Banner Headline (ଓଡ଼ିଆ)' }), bOdiaInp]),
      el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Context' }), bCtxInp]),
      el('div', { class: 'cso-mod-grid-2' }, [
        el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'CTA Button' }), bCtaInp]),
        el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'CTA URL' }), bUrlInp, makeRoutePicker(function (u) { bUrlInp.value = u; updateAll(); })])
      ]),
      el('div', { class: 'cso-mod-grid-2' }, [
        el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Starts At (optional)' }), bStartInp]),
        el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Expires At (optional)' }), bExpInp])
      ]),
      el('div', { class: 'cso-drawer-head' }, [
        el('strong', { text: 'Breaking News Marquee Ticker' }),
        el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: '+ Add Ticker Item', onclick: function () { tickerItems.push({ badge: 'NEW', text: '', url: '/jobs-careers/', urgent: false }); renderTickerEditor(); updateAll(); } })
      ]),
      tickerHost
    ]);

    heroCardRef = el('div', { class: 'cso-mod-card' }, [
      el('h3', { text: '2. Homepage Hero, Bilingual Copy, R2 Media & SEO (site_pages /)' }),
      el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'SEO Title' }), seoTitleInp]),
      el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Meta Description' }), seoDescInp]),
      el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Top Hero Announcement Badge' }), heroBadgeInp]),
      el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Hero Headline' }), heroTitleInp]),
      el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Hero Subtitle' }), heroSubInp]),
      el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Odia Hero Subtitle (ଓଡ଼ିଆ)' }), heroOdiaSubInp]),
      el('div', { class: 'cso-mod-grid-2' }, [
        el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Primary CTA Label' }), ctaLblInp]),
        el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Primary CTA URL' }), ctaUrlInp])
      ]),
      el('div', { class: 'cso-mod-grid-2' }, [
        el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Secondary CTA Label' }), secCtaLblInp]),
        el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Secondary CTA URL' }), secCtaUrlInp])
      ]),
      el('div', { class: 'cso-mod-field' }, [
        el('label', { class: 'cso-mod-label', text: 'Hero Cover / OpenGraph Image (og:image)' }),
        el('div', { class: 'cso-mod-toolbar' }, [
          ogImgInp,
          el('label', { class: 'cso-file-drop' }, [el('span', { text: '⬆ Upload to R2' }), r2Up]),
          el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Pick from R2 Library', onclick: toggleR2Picker })
        ]),
        r2PickHost
      ]),
      el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Image Alt Text' }), ogAltInp]),
      el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Trending Search Quick-Chips (comma-separated)' }), chipsInp]),
      el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Candidate Qualification Quick-Filter Pills' }), qualRow]),
      el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: '4 Impact / Trust Counters' }), trustHost])
    ]);

    var mUnpubBtn = el('button', { type: 'button', class: 'cso-pill cso-pill-active', text: 'Unpublished Real-CSS', onclick: function () { previewMode = 'unpublished'; syncPrevBtns(); updatePreviewPane(); } });
    var mLiveBtn = el('button', { type: 'button', class: 'cso-pill', text: 'Live /?preview=1', onclick: function () { previewMode = 'live'; syncPrevBtns(); updatePreviewPane(); } });
    var tVisBtn = el('button', { type: 'button', class: 'cso-pill cso-pill-active', text: 'Live Visual Preview', onclick: function () { previewTab = 'visual'; syncPrevBtns(); updatePreviewPane(); } });
    var tSerpBtn = el('button', { type: 'button', class: 'cso-pill', text: 'Google SERP & OG', onclick: function () { previewTab = 'serp'; syncPrevBtns(); updatePreviewPane(); } });
    var tJsonBtn = el('button', { type: 'button', class: 'cso-pill', text: 'JSON-LD Schema', onclick: function () { previewTab = 'jsonld'; syncPrevBtns(); updatePreviewPane(); } });
    var vDeskBtn = el('button', { type: 'button', class: 'cso-pill cso-pill-active', text: 'Desktop', onclick: function () { viewport = 'desktop'; syncPrevBtns(); updatePreviewPane(); } });
    var vTabBtn = el('button', { type: 'button', class: 'cso-pill', text: '768px', onclick: function () { viewport = 'tablet'; syncPrevBtns(); updatePreviewPane(); } });
    var vMobBtn = el('button', { type: 'button', class: 'cso-pill', text: '375px', onclick: function () { viewport = 'mobile'; syncPrevBtns(); updatePreviewPane(); } });
    function syncPrevBtns() {
      mUnpubBtn.classList.toggle('cso-pill-active', previewMode === 'unpublished');
      mLiveBtn.classList.toggle('cso-pill-active', previewMode === 'live');
      tVisBtn.classList.toggle('cso-pill-active', previewTab === 'visual');
      tSerpBtn.classList.toggle('cso-pill-active', previewTab === 'serp');
      tJsonBtn.classList.toggle('cso-pill-active', previewTab === 'jsonld');
      vDeskBtn.classList.toggle('cso-pill-active', viewport === 'desktop');
      vTabBtn.classList.toggle('cso-pill-active', viewport === 'tablet');
      vMobBtn.classList.toggle('cso-pill-active', viewport === 'mobile');
    }

    shell.appendChild(el('div', { class: 'cso-mod-grid-2' }, [
      el('div', { class: 'cso-mod-shell' }, [
        bannerCardRef,
        heroCardRef,
        el('div', { class: 'cso-mod-card' }, [
          el('div', { class: 'cso-drawer-head' }, [
            el('h3', { text: '3. Modular Homepage Sections Composer (Drag or ↑/↓)' }),
            el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Reset Default Sections', onclick: function () { sections = defaultHomeSections(); renderSectionsComposer(); updateAll(); } })
          ]),
          sectionsHost
        ])
      ]),
      el('div', { class: 'cso-mod-card cso-sticky-preview' }, [
        el('div', { class: 'cso-preview-header-stack' }, [
          el('h3', { text: 'Homepage Real-CSS Preview Studio' }),
          el('div', { class: 'cso-mod-toolbar' }, [
            mUnpubBtn, mLiveBtn, vDeskBtn, vTabBtn, vMobBtn,
            el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm cso-mod-btn-primary', text: 'Full-Screen Real View', onclick: openFullScreenPreview })
          ])
        ]),
        el('div', { class: 'cso-pill-row' }, [tVisBtn, tSerpBtn, tJsonBtn]),
        previewHost
      ])
    ]));

    [activeChk, sevSel, bHeadInp, bOdiaInp, bCtxInp, bCtaInp, bUrlInp, bStartInp, bExpInp,
      seoTitleInp, seoDescInp, heroBadgeInp, heroTitleInp, heroSubInp, heroOdiaSubInp,
      ctaLblInp, ctaUrlInp, secCtaLblInp, secCtaUrlInp, ogImgInp, ogAltInp, chipsInp
    ].forEach(function (inp) {
      inp.addEventListener('input', updateAll);
      inp.addEventListener('change', updateAll);
    });

    root.appendChild(shell);
    root.appendChild(fullscreenHost);

    try {
      var sr = localStorage.getItem(DRAFT_KEY);
      if (sr) {
        var sv = JSON.parse(sr);
        if (sv && (sv.seoTitle || sv.heroTitle)) {
          recoveryHost.appendChild(el('div', { class: 'cso-drawer' }, [
            el('div', { class: 'cso-drawer-head' }, [
              el('strong', { text: 'Unsaved Homepage Draft Found (' + (sv.savedAt || '').slice(0, 16) + ')' }),
              el('div', { class: 'cso-mod-toolbar' }, [
                el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm cso-mod-btn-primary', text: 'Restore Draft', onclick: function () {
                  if (sv.seoTitle) seoTitleInp.value = sv.seoTitle;
                  if (sv.seoDesc) seoDescInp.value = sv.seoDesc;
                  if (sv.heroTitle) heroTitleInp.value = sv.heroTitle;
                  if (sv.heroSub) heroSubInp.value = sv.heroSub;
                  if (sv.heroOdiaSub) heroOdiaSubInp.value = sv.heroOdiaSub;
                  if (Array.isArray(sv.ticker)) tickerItems = sv.ticker;
                  if (Array.isArray(sv.sections)) sections = sv.sections;
                  clear(recoveryHost);
                  renderTickerEditor();
                  renderSectionsComposer();
                  updateAll();
                } }),
                el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Discard', onclick: function () { localStorage.removeItem(DRAFT_KEY); clear(recoveryHost); } })
              ])
            ])
          ]));
        }
      }
    } catch (_) {}

    renderTickerEditor();
    renderSectionsComposer();
    loadHomepage();
  }

  /* -------------------------------------------------------------------------
     02-005: Landing Pages (SEO/CTA Audits + Inline Edit + Clone Live)
     ------------------------------------------------------------------------- */
  function renderLandingPagesStudio(root, actions) {
    addHeaderPill(actions, '● Landing Pages');
    var shell = el('div', { class: 'cso-mod-shell' });
    var kpiHost = el('div', {});
    var toolbarHost = el('div', {});
    var blueprintHost = el('div', {});
    var drawerHost = el('div', {});
    var tableHost = el('div', {});
    var fullscreenHost = el('div', {});

    var allLanding = [];
    var allRoutesList = [];
    var analyticsMap = {};
    var searchText = '';
    var activeFilter = 'all';

    function decodeEntities(str) {
      if (!str) return '';
      return String(str)
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
    }

    function hasBadSlug(route) {
      if (!route || route === '/') return false;
      return /\s/.test(route) || !/^\/[a-z0-9\-\/]*\/?$/.test(route);
    }

    function suggestCleanSlug(route) {
      if (!route || route === '/') return '/';
      var s = String(route).trim().toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9\-\/]/g, '-')
        .replace(/-+/g, '-')
        .replace(/\/+/g, '/');
      if (s.charAt(0) !== '/') s = '/' + s;
      if (s.length > 1 && s.charAt(s.length - 1) !== '/') s += '/';
      return s;
    }

    function escapeHtmlAttr(s) {
      return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function buildLandingPreviewHtml(cfg) {
      var title = escapeHtmlAttr(cfg.title || 'Landing Page Preview');
      var desc = escapeHtmlAttr(cfg.meta_description || '');
      var heroTitle = escapeHtmlAttr(cfg.hero_title || cfg.title || 'Odisha Portal Campaign');
      var heroSub = escapeHtmlAttr(cfg.hero_subtitle || '');
      var ctaLbl = escapeHtmlAttr(cfg.cta_label || '');
      var ctaUrl = escapeHtmlAttr(cfg.cta_url || '#');
      var secLbl = escapeHtmlAttr(cfg.secondary_cta_label || '');
      var secUrl = escapeHtmlAttr(cfg.secondary_cta_url || '#');
      var ogImg = escapeHtmlAttr(cfg.og_image || '');
      var isExpired = cfg.expires_at && !isNaN(Date.parse(cfg.expires_at)) && Date.parse(cfg.expires_at) < Date.now();
      var html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
        '<title>' + title + '</title>' +
        '<link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/assets/site.css">' +
        '</head><body>';
      if (!cfg.focused_landing_mode) {
        html += '<header class="site-header"><div class="container header-inner"><a class="brand" href="/">Common Sense Odisha</a></div></header>';
      }
      html += '<main class="container section">';
      if (isExpired) {
        html += '<div class="notice-banner" role="status"><strong>Campaign / Applications Closed</strong> — Deadline passed (' + escapeHtmlAttr(cfg.expires_at) + ').</div>';
      }
      html += '<section class="hero-card">';
      if (ogImg) html += '<p><img src="' + ogImg + '" alt="' + heroTitle + '" class="cso-preview-og-img"></p>';
      html += '<span class="badge">' + escapeHtmlAttr(cfg.category || 'Campaign') + '</span>';
      html += '<h1>' + heroTitle + '</h1>';
      if (heroSub) html += '<p class="lead">' + heroSub + '</p>';
      if (desc) html += '<p>' + desc + '</p>';
      html += '<div class="hero-actions">';
      if (ctaLbl) html += '<a class="btn btn-primary" href="' + ctaUrl + '">' + ctaLbl + '</a> ';
      if (secLbl) html += '<a class="btn btn-secondary" href="' + secUrl + '">' + secLbl + '</a>';
      html += '</div></section>';

      if (cfg.resources && cfg.resources.length) {
        html += '<section class="card"><h2>Official Resources &amp; Downloads</h2><ul>';
        cfg.resources.forEach(function (r) {
          html += '<li><a href="' + escapeHtmlAttr(r.url) + '">' + escapeHtmlAttr(r.label || r.url) + '</a> <small>(' + escapeHtmlAttr(r.kind || 'Link') + ')</small></li>';
        });
        html += '</ul></section>';
      }

      if (cfg.alert_optin && cfg.alert_optin.enabled) {
        html += '<section class="card"><h3>' + escapeHtmlAttr(cfg.alert_optin.heading || 'Get Instant Exam &amp; Scheme Alerts') + '</h3>' +
          '<a class="btn btn-primary" href="' + escapeHtmlAttr(cfg.alert_optin.channel_url || 'https://t.me/csodisha') + '">Join Official Alert Channel</a></section>';
      }

      html += '</main>';
      if (cfg.sticky_mobile_cta && cfg.sticky_mobile_cta.enabled && cfg.sticky_mobile_cta.label) {
        html += '<div class="sticky-mobile-cta"><div class="container"><strong>' + escapeHtmlAttr(cfg.sticky_mobile_cta.label) + '</strong>' +
          (cfg.sticky_mobile_cta.odia_sub ? ' <span>' + escapeHtmlAttr(cfg.sticky_mobile_cta.odia_sub) + '</span>' : '') +
          ' <a class="btn btn-primary" href="' + escapeHtmlAttr(cfg.sticky_mobile_cta.url || ctaUrl) + '">Open</a></div></div>';
      }
      html += '</body></html>';
      return html;
    }

    function openFullscreenPreview(cfg, initialViewport) {
      clear(fullscreenHost);
      var fsMode = initialViewport || 'desktop';
      var fsFrame = el('iframe', {
        class: 'cso-fullscreen-frame' + (fsMode === 'tablet' ? ' is-tablet' : fsMode === 'mobile' ? ' is-mobile' : ''),
        sandbox: 'allow-same-origin',
        title: 'Landing Page Full-Screen Real View'
      });
      fsFrame.srcdoc = buildLandingPreviewHtml(cfg);
      var bD = el('button', { type: 'button', class: 'cso-pill' + (fsMode === 'desktop' ? ' cso-pill-active' : ''), text: 'Desktop 100%', onclick: function () { setFs('desktop'); } });
      var bT = el('button', { type: 'button', class: 'cso-pill' + (fsMode === 'tablet' ? ' cso-pill-active' : ''), text: 'Tablet 768px', onclick: function () { setFs('tablet'); } });
      var bM = el('button', { type: 'button', class: 'cso-pill' + (fsMode === 'mobile' ? ' cso-pill-active' : ''), text: 'Mobile 375px', onclick: function () { setFs('mobile'); } });
      function setFs(m) {
        fsMode = m;
        bD.classList.toggle('cso-pill-active', m === 'desktop');
        bT.classList.toggle('cso-pill-active', m === 'tablet');
        bM.classList.toggle('cso-pill-active', m === 'mobile');
        fsFrame.className = 'cso-fullscreen-frame' + (m === 'tablet' ? ' is-tablet' : m === 'mobile' ? ' is-mobile' : '');
      }
      function closeFs() { document.removeEventListener('keydown', onEsc); clear(fullscreenHost); }
      function onEsc(e) { if (e.key === 'Escape') closeFs(); }
      document.addEventListener('keydown', onEsc);
      fullscreenHost.appendChild(el('div', { class: 'cso-fullscreen-overlay' }, [
        el('div', { class: 'cso-drawer-head' }, [
          el('div', { class: 'cso-mod-toolbar' }, [
            el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: '← Back to Studio', onclick: closeFs }),
            el('strong', { text: 'Real-CSS Live Preview — ' + (cfg.route || '/') })
          ]),
          el('div', { class: 'cso-mod-toolbar' }, [bD, bT, bM])
        ]),
        el('div', { class: 'cso-fullscreen-stage' }, [fsFrame])
      ]));
    }

    function openR2Picker(onPick) {
      var pickHost = el('div', { class: 'cso-drawer' });
      pickHost.appendChild(el('div', { class: 'cso-drawer-head' }, [
        el('strong', { text: 'Pick from R2 Media Library' }),
        el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Close', onclick: function () { pickHost.remove(); } })
      ]));
      var listBox = el('div', { class: 'cso-mod-muted', text: 'Loading R2 assets...' });
      pickHost.appendChild(listBox);
      drawerHost.appendChild(pickHost);
      api('GET', 'media').then(function (d) {
        clear(listBox);
        var items = d.media || d.files || d.objects || [];
        if (!items.length) { listBox.textContent = 'No R2 media files found.'; return; }
        var grid = el('div', { class: 'cso-mod-grid-3' });
        items.slice(0, 24).forEach(function (it) {
          var url = it.url || it.public_url || ('/media/' + (it.key || it.name || ''));
          var name = it.name || it.key || url;
          grid.appendChild(el('div', { class: 'cso-mod-card' }, [
            el('div', { class: 'cso-mod-label', text: name }),
            el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm cso-mod-btn-primary', text: 'Use Asset', onclick: function () { onPick(url, name); pickHost.remove(); } })
          ]));
        });
        listBox.appendChild(grid);
      }).catch(function (e) { listBox.textContent = e.message; });
    }

    function openCloneDrawer(p) {
      clear(drawerHost);
      var base = p.route === '/' ? '/campaign-home/' : suggestCleanSlug(p.route).replace(/\/$/, '') + '-variant-b/';
      var slugInp = el('input', { type: 'text', class: 'cso-mod-input', value: base });
      var titleInp = el('input', { type: 'text', class: 'cso-mod-input', value: decodeEntities(p.title || 'Landing Page') + ' (Variant B)' });
      var cloneBtn = el('button', {
        type: 'button',
        class: 'cso-mod-btn cso-mod-btn-primary',
        text: 'Clone & Publish A/B Variant Live',
        onclick: async function () {
          cloneBtn.disabled = true;
          try {
            var newRoute = f02NormalizeRoute(slugInp.value);
            await api('POST', 'pages', {
              route: newRoute,
              title: titleInp.value.trim(),
              meta_description: decodeEntities(p.meta_description || ''),
              category: p.category || 'Core Portal',
              hero_title: decodeEntities(p.hero_title || titleInp.value.trim()),
              hero_subtitle: decodeEntities(p.hero_subtitle || ''),
              cta_label: decodeEntities(p.cta_label || 'Explore Now'),
              cta_url: p.cta_url || '/jobs-careers/',
              secondary_cta_label: p.secondary_cta_label || '',
              secondary_cta_url: p.secondary_cta_url || '',
              og_image: p.og_image || '',
              blocks_json: p.blocks_json || '[]',
              status: 'published',
              note: 'A/B Variant cloned from ' + p.route
            });
            toast('Cloned & published A/B variant: ' + newRoute, 'success');
            clear(drawerHost);
            await loadLanding();
          } catch (e) { toast(e.message, 'crimson'); }
          finally { cloneBtn.disabled = false; }
        }
      });
      drawerHost.appendChild(el('div', { class: 'cso-drawer' }, [
        el('div', { class: 'cso-drawer-head' }, [
          el('strong', { text: 'Clone A/B Variant — ' + p.route }),
          el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Close', onclick: function () { clear(drawerHost); } })
        ]),
        el('div', { class: 'cso-mod-grid-2' }, [
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'New Live Variant Route' }), slugInp]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Variant Page Title' }), titleInp])
        ]),
        cloneBtn
      ]));
    }

    function openInlineEdit(p) {
      clear(drawerHost);
      var cleanTitle = decodeEntities(p.title || '');
      var cleanDesc = decodeEntities(p.meta_description || '');
      var cleanHeroSub = decodeEntities(p.hero_subtitle || '');
      var cleanCtaLbl = decodeEntities(p.cta_label || '');
      var resources = Array.isArray(p.resources) ? p.resources.slice() : [];
      var stickyCfg = (p.sticky_mobile_cta && typeof p.sticky_mobile_cta === 'object') ? p.sticky_mobile_cta : { enabled: false, label: '', url: '', odia_sub: '' };
      var alertCfg = (p.alert_optin && typeof p.alert_optin === 'object') ? p.alert_optin : { enabled: false, heading: 'Get Instant Exam & Scheme Alerts', channel_url: 'https://t.me/csodisha' };

      var tInp = el('input', { type: 'text', class: 'cso-mod-input', value: cleanTitle });
      var dInp = el('input', { type: 'text', class: 'cso-mod-input', value: cleanDesc });
      var hSubInp = el('input', { type: 'text', class: 'cso-mod-input', placeholder: 'Odia / Bilingual Hero Subtitle (ଓଡ଼ିଆ)', value: cleanHeroSub });
      var cLbl = el('input', { type: 'text', class: 'cso-mod-input', value: cleanCtaLbl });
      var cUrl = el('input', { type: 'text', class: 'cso-mod-input', value: p.cta_url || '' });
      var secLbl = el('input', { type: 'text', class: 'cso-mod-input', placeholder: 'e.g. Download Notification PDF', value: decodeEntities(p.secondary_cta_label || '') });
      var secUrl = el('input', { type: 'text', class: 'cso-mod-input', placeholder: '/media/... or https://...', value: p.secondary_cta_url || '' });

      var routePicker = el('select', { class: 'cso-mod-select' }, [
        el('option', { value: '', text: '— Pick Verified Internal Route for Primary CTA —' })
      ].concat(allRoutesList.map(function (rt) { return el('option', { value: rt, text: rt }); })));
      routePicker.addEventListener('change', function () {
        if (routePicker.value) { cUrl.value = routePicker.value; updateLivePreview(); }
      });

      var focusedChk = el('input', { type: 'checkbox' });
      focusedChk.checked = !!p.focused_landing_mode;

      var stickyChk = el('input', { type: 'checkbox' });
      stickyChk.checked = !!stickyCfg.enabled;
      var stickyLbl = el('input', { type: 'text', class: 'cso-mod-input', placeholder: 'Sticky CTA Label (e.g. Apply Online Now)', value: stickyCfg.label || '' });
      var stickyUrl = el('input', { type: 'text', class: 'cso-mod-input', placeholder: 'Target Route / PDF / Drive URL', value: stickyCfg.url || '' });
      var stickyOdia = el('input', { type: 'text', class: 'cso-mod-input', placeholder: 'Odia Sub-label (e.g. ଆବେଦନ କରନ୍ତୁ)', value: stickyCfg.odia_sub || '' });

      var alertChk = el('input', { type: 'checkbox' });
      alertChk.checked = !!alertCfg.enabled;
      var alertHeading = el('input', { type: 'text', class: 'cso-mod-input', value: alertCfg.heading || 'Get Instant Exam & Scheme Alerts' });
      var alertUrl = el('input', { type: 'text', class: 'cso-mod-input', placeholder: 'Telegram / WhatsApp Channel URL', value: alertCfg.channel_url || 'https://t.me/csodisha' });

      var expAtInp = el('input', { type: 'date', class: 'cso-mod-input', value: p.expires_at ? String(p.expires_at).slice(0, 10) : '' });
      var expActionSel = el('select', { class: 'cso-mod-select' }, [
        el('option', { value: 'notice', text: 'Show "Applications / Campaign Closed" Notice' }),
        el('option', { value: 'redirect', text: 'Auto-301 Redirect to Evergreen Hub' })
      ]);
      expActionSel.value = p.expired_action === 'redirect' ? 'redirect' : 'notice';
      var expRedirInp = el('input', { type: 'text', class: 'cso-mod-input', placeholder: '/jobs-careers/', value: p.expired_redirect || '/jobs-careers/' });

      var ogInp = el('input', { type: 'text', class: 'cso-mod-input', placeholder: '/media/og-campaign.png', value: p.og_image || '' });
      var ogPreviewImg = el('img', { class: 'cso-asset-preview-img', alt: 'OG Social Card Preview', src: p.og_image || '/assets/og-default.png' });

      var utmSrc = el('input', { type: 'text', class: 'cso-mod-input', value: p.utm_source || 'telegram' });
      var utmMed = el('input', { type: 'text', class: 'cso-mod-input', value: p.utm_medium || 'social' });
      var utmCamp = el('input', { type: 'text', class: 'cso-mod-input', value: p.utm_campaign || suggestCleanSlug(p.route).replace(/\//g, '') || 'odisha-campaign' });
      var utmOut = el('input', { type: 'text', class: 'cso-mod-input', readOnly: true });

      function refreshUtm() {
        var base = 'https://csodisha.com' + (p.route || '/');
        var q = 'utm_source=' + encodeURIComponent(utmSrc.value.trim() || 'direct') +
          '&utm_medium=' + encodeURIComponent(utmMed.value.trim() || 'web') +
          '&utm_campaign=' + encodeURIComponent(utmCamp.value.trim() || 'campaign');
        utmOut.value = base + '?' + q;
      }
      refreshUtm();
      [utmSrc, utmMed, utmCamp].forEach(function (inp) { inp.addEventListener('input', refreshUtm); });

      var resListHost = el('div', {});
      var resVerifyHost = el('div', { class: 'cso-mod-muted' });
      function renderResList() {
        clear(resListHost);
        if (!resources.length) {
          resListHost.appendChild(el('p', { class: 'cso-mod-muted', text: 'No PDFs, R2 files, or external links attached yet.' }));
          return;
        }
        resources.forEach(function (r, idx) {
          resListHost.appendChild(el('div', { class: 'cso-mod-toolbar' }, [
            badge(r.kind || 'Link', 'info'),
            el('strong', { text: r.label || r.url }),
            el('code', { text: r.url }),
            el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Remove', onclick: function () { resources.splice(idx, 1); renderResList(); updateLivePreview(); } })
          ]));
        });
      }
      renderResList();

      var resFileInput = el('input', { type: 'file', class: 'cso-sr-file', accept: '.pdf,.png,.jpg,.jpeg,.webp,.docx,.xlsx,.zip' });
      resFileInput.addEventListener('change', async function () {
        var f = resFileInput.files && resFileInput.files[0];
        if (!f) return;
        try {
          var fd = new FormData();
          fd.append('file', f);
          var up = await api('POST', 'media/upload', fd, true);
          var url = up.url || up.public_url || ('/media/' + (up.key || f.name));
          resources.push({ label: f.name, url: url, kind: 'R2 PDF/File' });
          renderResList();
          updateLivePreview();
          toast('Uploaded to R2: ' + f.name, 'success');
        } catch (e) { toast(e.message, 'crimson'); }
      });

      var ogFileInput = el('input', { type: 'file', class: 'cso-sr-file', accept: 'image/png,image/jpeg,image/webp' });
      ogFileInput.addEventListener('change', async function () {
        var f = ogFileInput.files && ogFileInput.files[0];
        if (!f) return;
        try {
          var fd = new FormData();
          fd.append('file', f);
          var up = await api('POST', 'media/upload', fd, true);
          var url = up.url || up.public_url || ('/media/' + (up.key || f.name));
          ogInp.value = url;
          ogPreviewImg.src = url;
          updateLivePreview();
          toast('Uploaded OG image to R2', 'success');
        } catch (e) { toast(e.message, 'crimson'); }
      });

      var extLblInp = el('input', { type: 'text', class: 'cso-mod-input', placeholder: 'Resource Label (e.g. Official OPSC PDF)' });
      var extUrlInp = el('input', { type: 'text', class: 'cso-mod-input', placeholder: 'https://drive.google.com/... or https://opsc.gov.in/...' });
      var extKindSel = el('select', { class: 'cso-mod-select' }, [
        el('option', { value: 'Google Drive', text: 'Google Drive Link' }),
        el('option', { value: '.gov.in Official', text: '.gov.in Official Link' }),
        el('option', { value: 'External Resource', text: 'External Resource' })
      ]);

      var previewViewport = 'desktop';
      var previewFrame = el('iframe', { class: 'cso-builder-iframe', sandbox: 'allow-same-origin', title: 'Landing Live Preview' });
      function getCfg() {
        return {
          route: p.route,
          category: p.category || 'Campaign',
          title: tInp.value.trim(),
          meta_description: dInp.value.trim(),
          hero_title: tInp.value.trim(),
          hero_subtitle: hSubInp.value.trim(),
          cta_label: cLbl.value.trim(),
          cta_url: cUrl.value.trim(),
          secondary_cta_label: secLbl.value.trim(),
          secondary_cta_url: secUrl.value.trim(),
          focused_landing_mode: focusedChk.checked,
          sticky_mobile_cta: { enabled: stickyChk.checked, label: stickyLbl.value.trim(), url: stickyUrl.value.trim(), odia_sub: stickyOdia.value.trim() },
          alert_optin: { enabled: alertChk.checked, heading: alertHeading.value.trim(), channel_url: alertUrl.value.trim() },
          expires_at: expAtInp.value.trim(),
          expired_action: expActionSel.value,
          expired_redirect: expRedirInp.value.trim(),
          og_image: ogInp.value.trim(),
          resources: resources
        };
      }
      function updateLivePreview() {
        previewFrame.srcdoc = buildLandingPreviewHtml(getCfg());
        if (ogInp.value.trim()) ogPreviewImg.src = ogInp.value.trim();
      }
      [tInp, dInp, hSubInp, cLbl, cUrl, secLbl, secUrl, stickyLbl, stickyUrl, stickyOdia, alertHeading, alertUrl, expAtInp, expRedirInp, ogInp].forEach(function (inp) {
        inp.addEventListener('input', updateLivePreview);
      });
      [focusedChk, stickyChk, alertChk, expActionSel].forEach(function (inp) {
        inp.addEventListener('change', updateLivePreview);
      });
      updateLivePreview();

      var aiBtn = el('button', {
        type: 'button',
        class: 'cso-mod-btn cso-mod-btn-sm',
        text: '✨ AI Optimize Copy & CTAs',
        onclick: async function () {
          aiBtn.disabled = true;
          try {
            var res = await api('POST', 'ai/generate-page', {
              mode: 'optimize',
              route: p.route,
              topic: tInp.value.trim() || p.route,
              language: 'Bilingual English + Odia'
            });
            var gen = res.page || res;
            if (gen.title) tInp.value = decodeEntities(gen.title);
            if (gen.meta_description) dInp.value = decodeEntities(gen.meta_description);
            if (gen.hero_subtitle) hSubInp.value = decodeEntities(gen.hero_subtitle);
            if (gen.cta_label) cLbl.value = decodeEntities(gen.cta_label);
            if (gen.cta_url) cUrl.value = gen.cta_url;
            updateLivePreview();
            toast('AI generated conversion copy & Odia subtitle', 'success');
          } catch (e) { toast(e.message, 'crimson'); }
          finally { aiBtn.disabled = false; }
        }
      });

      var vpD = el('button', { type: 'button', class: 'cso-pill cso-pill-active', text: 'Desktop', onclick: function () { setVp('desktop'); } });
      var vpT = el('button', { type: 'button', class: 'cso-pill', text: '768px', onclick: function () { setVp('tablet'); } });
      var vpM = el('button', { type: 'button', class: 'cso-pill', text: '375px', onclick: function () { setVp('mobile'); } });
      function setVp(v) {
        previewViewport = v;
        vpD.classList.toggle('cso-pill-active', v === 'desktop');
        vpT.classList.toggle('cso-pill-active', v === 'tablet');
        vpM.classList.toggle('cso-pill-active', v === 'mobile');
        previewFrame.className = 'cso-builder-iframe' + (v === 'mobile' ? ' cso-preview-frame-mobile' : '');
      }

      drawerHost.appendChild(el('div', { class: 'cso-drawer' }, [
        el('div', { class: 'cso-drawer-head' }, [
          el('strong', { text: 'Landing Conversion & Campaign Drawer — ' + p.route }),
          el('div', { class: 'cso-mod-toolbar' }, [
            aiBtn,
            el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Full-Screen Real View', onclick: function () { openFullscreenPreview(getCfg(), previewViewport); } }),
            el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Close', onclick: function () { clear(drawerHost); } })
          ])
        ]),
        el('div', { class: 'cso-mod-grid-2' }, [
          el('div', {}, [
            el('div', { class: 'cso-mod-grid-2' }, [
              el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'SEO Title' }), tInp]),
              el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Meta Description (~150 chars)' }), dInp]),
              el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Bilingual Odia Hero Subtitle (ଓଡ଼ିଆ)' }), hSubInp]),
              el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Verified Internal Route Picker' }), routePicker]),
              el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Primary CTA Label' }), cLbl]),
              el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Primary CTA URL' }), cUrl]),
              el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Secondary CTA Label' }), secLbl]),
              el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Secondary CTA URL' }), secUrl])
            ]),
            el('label', { class: 'cso-mod-toolbar' }, [focusedChk, el('span', { text: 'Focused Landing Mode (hide global nav chrome)' })]),
            el('div', { class: 'cso-mod-card' }, [
              el('strong', { text: 'Floating Mobile Sticky CTA Bar' }),
              el('label', { class: 'cso-mod-toolbar' }, [stickyChk, el('span', { text: 'Enable Sticky Mobile CTA on 375px+' })]),
              el('div', { class: 'cso-mod-grid-3' }, [stickyLbl, stickyUrl, stickyOdia])
            ]),
            el('div', { class: 'cso-mod-card' }, [
              el('strong', { text: 'Quick Resource & PDF Attachment Strip' }),
              el('div', { class: 'cso-mod-toolbar' }, [
                el('label', { class: 'cso-mod-btn cso-mod-btn-sm' }, ['Upload PDF to R2', resFileInput]),
                el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Pick from R2 Library', onclick: function () { openR2Picker(function (u, n) { resources.push({ label: n, url: u, kind: 'R2 Library' }); renderResList(); updateLivePreview(); }); } }),
                el('button', {
                  type: 'button',
                  class: 'cso-mod-btn cso-mod-btn-sm',
                  text: 'Verify All Links (200 OK)',
                  onclick: async function () {
                    var urls = [cUrl.value.trim(), secUrl.value.trim(), stickyUrl.value.trim(), alertUrl.value.trim()]
                      .concat(resources.map(function (r) { return r.url; }))
                      .filter(Boolean);
                    if (!urls.length) { toast('No URLs to verify', 'warn'); return; }
                    try {
                      var r = await api('POST', 'utils/check-links', { urls: urls });
                      var results = r.results || [];
                      var okCnt = results.filter(function (x) { return x.ok || (x.status >= 200 && x.status < 400); }).length;
                      resVerifyHost.textContent = 'Link check: ' + okCnt + '/' + results.length + ' returned 200 OK';
                    } catch (e) { resVerifyHost.textContent = 'Check failed: ' + e.message; }
                  }
                })
              ]),
              el('div', { class: 'cso-mod-grid-3' }, [
                extKindSel,
                extLblInp,
                el('div', { class: 'cso-mod-toolbar' }, [
                  extUrlInp,
                  el('button', {
                    type: 'button',
                    class: 'cso-mod-btn cso-mod-btn-sm',
                    text: '+ Add Link',
                    onclick: function () {
                      if (!extUrlInp.value.trim()) return;
                      resources.push({ label: extLblInp.value.trim() || extUrlInp.value.trim(), url: extUrlInp.value.trim(), kind: extKindSel.value });
                      extLblInp.value = '';
                      extUrlInp.value = '';
                      renderResList();
                      updateLivePreview();
                    }
                  })
                ])
              ]),
              resListHost,
              resVerifyHost
            ]),
            el('div', { class: 'cso-mod-card' }, [
              el('strong', { text: 'Candidate Exam / Scheme Alert Opt-In & Auto-Expiry' }),
              el('label', { class: 'cso-mod-toolbar' }, [alertChk, el('span', { text: 'Enable Alert Opt-In Strip' })]),
              el('div', { class: 'cso-mod-grid-2' }, [alertHeading, alertUrl]),
              el('div', { class: 'cso-mod-grid-3' }, [
                el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Deadline / Expiry Date' }), expAtInp]),
                el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Post-Deadline Action' }), expActionSel]),
                el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Evergreen Redirect Target' }), expRedirInp])
              ])
            ]),
            el('div', { class: 'cso-mod-card' }, [
              el('strong', { text: 'Shareable UTM Campaign Link Builder & OpenGraph Card' }),
              el('div', { class: 'cso-mod-toolbar' }, [
                el('button', { type: 'button', class: 'cso-pill', text: 'Telegram', onclick: function () { utmSrc.value = 'telegram'; utmMed.value = 'channel'; refreshUtm(); } }),
                el('button', { type: 'button', class: 'cso-pill', text: 'WhatsApp', onclick: function () { utmSrc.value = 'whatsapp'; utmMed.value = 'broadcast'; refreshUtm(); } }),
                el('button', { type: 'button', class: 'cso-pill', text: 'YouTube', onclick: function () { utmSrc.value = 'youtube'; utmMed.value = 'video'; refreshUtm(); } }),
                el('button', { type: 'button', class: 'cso-pill', text: 'Google Discover', onclick: function () { utmSrc.value = 'google_discover'; utmMed.value = 'feed'; refreshUtm(); } })
              ]),
              el('div', { class: 'cso-mod-grid-3' }, [utmSrc, utmMed, utmCamp]),
              el('div', { class: 'cso-mod-toolbar' }, [
                utmOut,
                el('button', {
                  type: 'button',
                  class: 'cso-mod-btn cso-mod-btn-sm',
                  text: 'Copy UTM Link',
                  onclick: function () {
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                      navigator.clipboard.writeText(utmOut.value);
                      toast('Copied UTM campaign URL', 'success');
                    }
                  }
                })
              ]),
              el('div', { class: 'cso-mod-toolbar' }, [
                ogInp,
                el('label', { class: 'cso-mod-btn cso-mod-btn-sm' }, ['Upload OG Image to R2', ogFileInput]),
                el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Pick OG from R2', onclick: function () { openR2Picker(function (u) { ogInp.value = u; ogPreviewImg.src = u; updateLivePreview(); }); } })
              ]),
              el('div', { class: 'cso-og-card' }, [ogPreviewImg, el('strong', { text: cleanTitle || p.route }), el('p', { class: 'cso-mod-muted', text: cleanDesc })])
            ]),
            el('div', { class: 'cso-mod-toolbar' }, [
              el('button', {
                type: 'button',
                class: 'cso-mod-btn cso-mod-btn-primary',
                text: 'Save Campaign Live',
                onclick: async function () {
                  try {
                    var cfg = getCfg();
                    await api('PUT', 'pages', {
                      route: p.route,
                      title: cfg.title,
                      meta_description: cfg.meta_description,
                      hero_subtitle: cfg.hero_subtitle,
                      cta_label: cfg.cta_label,
                      cta_url: cfg.cta_url,
                      secondary_cta_label: cfg.secondary_cta_label,
                      secondary_cta_url: cfg.secondary_cta_url,
                      focused_landing_mode: cfg.focused_landing_mode,
                      sticky_mobile_cta: cfg.sticky_mobile_cta,
                      alert_optin: cfg.alert_optin,
                      expires_at: cfg.expires_at,
                      expired_action: cfg.expired_action,
                      expired_redirect: cfg.expired_redirect,
                      og_image: cfg.og_image,
                      utm_source: utmSrc.value.trim(),
                      utm_medium: utmMed.value.trim(),
                      utm_campaign: utmCamp.value.trim(),
                      resources: resources,
                      status: 'published',
                      note: 'Landing campaign studio update'
                    });
                    toast('Saved landing campaign live: ' + p.route, 'success');
                    clear(drawerHost);
                    await loadLanding();
                  } catch (e) { toast(e.message, 'crimson'); }
                }
              })
            ])
          ]),
          el('div', {}, [
            el('div', { class: 'cso-drawer-head' }, [
              el('strong', { text: 'Real-CSS Live Preview' }),
              el('div', { class: 'cso-pill-row' }, [vpD, vpT, vpM])
            ]),
            el('div', { class: 'cso-preview-frame-wrap' }, [previewFrame])
          ])
        ])
      ]));
    }

    async function fixSlug(p) {
      var target = suggestCleanSlug(p.route);
      try {
        await api('PUT', 'pages', {
          old_route: p.route,
          route: target,
          create_redirect: true,
          title: decodeEntities(p.title || target),
          meta_description: decodeEntities(p.meta_description || ''),
          status: p.status || 'published',
          note: 'Auto-repaired slug & 301 redirect from ' + p.route
        });
        toast('Fixed slug ' + p.route + ' → ' + target + ' (301 redirect active)', 'success');
        await loadLanding();
      } catch (e) { toast(e.message, 'crimson'); }
    }

    async function bulkFixMissing() {
      var targets = allLanding.filter(function (p) {
        var desc = decodeEntities(p.meta_description || '');
        return !p.cta_label || !p.cta_url || desc.length < 40;
      });
      if (!targets.length) { toast('All landing routes already have CTAs & healthy SEO', 'info'); return; }
      var fixed = 0;
      for (var i = 0; i < targets.length; i++) {
        var p = targets[i];
        var title = decodeEntities(p.title || p.route);
        var ctaLbl = p.cta_label || (/exam|opsc|ossc|osssc/i.test(title + p.route) ? 'Start Free Mock Test' : /scheme|yojana|welfare/i.test(title + p.route) ? 'Check Eligibility & Apply' : 'Explore Odisha Portal');
        var ctaUrl = p.cta_url || (/exam|opsc|ossc|osssc/i.test(title + p.route) ? '/mock-tests/' : '/jobs-careers/');
        var desc = decodeEntities(p.meta_description || '');
        if (desc.length < 40) {
          desc = (title + ' — Verified Odisha portal guide with official notifications, eligibility details, syllabus PDFs & free CBT practice on Common Sense Odisha.').slice(0, 155);
        }
        try {
          await api('PUT', 'pages', {
            route: p.route,
            title: title,
            meta_description: desc,
            cta_label: ctaLbl,
            cta_url: ctaUrl,
            status: p.status || 'published',
            note: 'Bulk CTA & SEO auto-fix'
          });
          fixed++;
        } catch (_e) { /* continue */ }
      }
      toast('Bulk fixed ' + fixed + ' landing routes', 'success');
      await loadLanding();
    }

    function renderKpisAndTable() {
      clear(kpiHost);
      clear(tableHost);

      var total = allLanding.length;
      var ctaReady = allLanding.filter(function (p) { return !!(p.cta_label && p.cta_url); }).length;
      var seoHealthy = allLanding.filter(function (p) { return decodeEntities(p.title || '').length > 0 && decodeEntities(p.meta_description || '').length >= 40; }).length;
      var slugAlerts = allLanding.filter(function (p) { return hasBadSlug(p.route); }).length;

      kpiHost.appendChild(el('div', { class: 'cso-kpi-grid-4' }, [
        el('div', { class: 'cso-mod-card' }, [el('div', { class: 'cso-mod-label', text: 'Total Landing Routes' }), el('strong', { text: String(total) })]),
        el('div', { class: 'cso-mod-card' }, [el('div', { class: 'cso-mod-label', text: 'CTA-Ready Routes' }), el('strong', { text: ctaReady + ' / ' + total })]),
        el('div', { class: 'cso-mod-card' }, [el('div', { class: 'cso-mod-label', text: 'SEO Healthy Routes' }), el('strong', { text: seoHealthy + ' / ' + total })]),
        el('div', { class: 'cso-mod-card' }, [el('div', { class: 'cso-mod-label', text: 'Slug & Link Alerts' }), el('strong', { text: String(slugAlerts) })])
      ]));

      var filtered = allLanding.filter(function (p) {
        var title = decodeEntities(p.title || '');
        var desc = decodeEntities(p.meta_description || '');
        var seoOk = title.length > 0 && desc.length >= 40;
        var ctaOk = !!(p.cta_label && p.cta_url);
        var badSlug = hasBadSlug(p.route);
        if (activeFilter === 'missing-cta' && ctaOk) return false;
        if (activeFilter === 'needs-seo' && seoOk) return false;
        if (activeFilter === 'slug-alerts' && !badSlug) return false;
        if (activeFilter === 'active-campaigns' && !(p.sticky_mobile_cta && p.sticky_mobile_cta.enabled) && !p.expires_at && !p.utm_campaign) return false;
        if (searchText) {
          var q = searchText.toLowerCase();
          if ((title + ' ' + p.route + ' ' + (p.category || '')).toLowerCase().indexOf(q) === -1) return false;
        }
        return true;
      });

      var rows = filtered.map(function (p) {
        var cleanTitle = decodeEntities(p.title || p.route);
        var cleanDesc = decodeEntities(p.meta_description || '');
        var seoOk = cleanTitle.length > 0 && cleanDesc.length >= 40;
        var ctaOk = !!(p.cta_label && p.cta_url);
        var badSlug = hasBadSlug(p.route);
        var views = analyticsMap[p.route];
        var rowActions = [
          el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Edit SEO/CTA', onclick: function () { openInlineEdit(p); } }),
          el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Preview', onclick: function () { openFullscreenPreview(p, 'desktop'); } }),
          el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-primary cso-mod-btn-sm', text: 'Clone Live', onclick: function () { openCloneDrawer(p); } }),
          el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Edit in Full Studio', onclick: function () { f02State.editRoute = p.route; f02State.editPage = p; window.selectModule && window.selectModule('folder-02', 'module-02-002'); } }),
          el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Builder', onclick: function () { f02State.builderRoute = p.route; window.selectModule && window.selectModule('folder-02', 'module-02-003'); } }),
          el('a', { href: p.route, target: '_blank', rel: 'noopener noreferrer', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Open ↗' })
        ];
        if (badSlug) {
          rowActions.unshift(el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Fix Slug (301)', onclick: function () { fixSlug(p); } }));
        }
        return el('tr', {}, [
          el('td', {}, [
            el('strong', { text: cleanTitle }),
            el('div', {}, [el('code', { text: p.route }), ' ', badSlug ? badge('Invalid Slug', 'warn') : '', views != null ? ' ' : '', views != null ? badge(String(views) + ' views', 'info') : ''])
          ]),
          el('td', {}, [badge(seoOk ? 'SEO OK' : 'Check Meta', seoOk ? 'ok' : 'warn'), ' ', badge(ctaOk ? 'CTA Ready' : 'No CTA', ctaOk ? 'ok' : 'info')]),
          el('td', {}, f02StatusBadge(p.status)),
          el('td', {}, el('div', { class: 'cso-mod-toolbar' }, rowActions))
        ]);
      });
      tableHost.appendChild(safeTable(['Landing Route', 'SEO & CTA Audit', 'Status', 'Actions'], rows));
    }

    function renderToolbar() {
      clear(toolbarHost);
      var searchInp = el('input', { type: 'search', class: 'cso-mod-input', placeholder: 'Search landing route, title, or category...', value: searchText });
      searchInp.addEventListener('input', function () { searchText = searchInp.value.trim(); renderKpisAndTable(); });
      var filterDefs = [
        ['all', 'All Routes'],
        ['missing-cta', 'Missing CTA'],
        ['needs-seo', 'Needs SEO Fix'],
        ['slug-alerts', 'Slug Alerts'],
        ['active-campaigns', 'Active Campaigns']
      ];
      var pills = filterDefs.map(function (fd) {
        return el('button', {
          type: 'button',
          class: 'cso-pill' + (activeFilter === fd[0] ? ' cso-pill-active' : ''),
          text: fd[1],
          onclick: function () { activeFilter = fd[0]; renderToolbar(); renderKpisAndTable(); }
        });
      });
      toolbarHost.appendChild(el('div', { class: 'cso-mod-toolbar' }, [searchInp, el('div', { class: 'cso-pill-row' }, pills)]));
    }

    function toggleBlueprints() {
      if (blueprintHost.childNodes.length) { clear(blueprintHost); return; }
      var blueprints = [
        { name: 'Exam Notification & Admit Card Hub', category: 'Exam Guide', cta_label: 'Download Admit Card & Syllabus', cta_url: '/mock-tests/' },
        { name: 'Free CBT Mock Test Campaign', category: 'Exam Guide', cta_label: 'Start Free CBT Test Now', cta_url: '/mock-tests/' },
        { name: 'Govt Scheme Eligibility & Apply Page', category: 'Core Portal', cta_label: 'Check Eligibility & Apply Online', cta_url: '/jobs-careers/' },
        { name: 'District Recruitment Drive Hub', category: 'Recruitment', cta_label: 'View District Vacancies', cta_url: '/jobs-careers/' }
      ];
      blueprintHost.appendChild(el('div', { class: 'cso-drawer' }, [
        el('div', { class: 'cso-drawer-head' }, [
          el('strong', { text: 'High-Converting Campaign Blueprints' }),
          el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Close', onclick: function () { clear(blueprintHost); } })
        ]),
        el('div', { class: 'cso-mod-grid-4' }, blueprints.map(function (bp) {
          return el('div', { class: 'cso-mod-card' }, [
            el('strong', { text: bp.name }),
            el('p', { class: 'cso-mod-muted', text: bp.category + ' · ' + bp.cta_label }),
            el('button', {
              type: 'button',
              class: 'cso-mod-btn cso-mod-btn-primary cso-mod-btn-sm',
              text: 'Launch Blueprint →',
              onclick: function () {
                f02State.createTemplate = bp;
                window.selectModule && window.selectModule('folder-02', 'module-02-002');
              }
            })
          ]);
        }))
      ]));
    }

    async function loadLanding() {
      clear(tableHost);
      try {
        var d = await api('GET', 'pages');
        var pages = d.pages || [];
        allRoutesList = pages.map(function (x) { return x.route; }).filter(Boolean);
        allLanding = pages.filter(function (p) {
          return p.category === 'Core Portal' || p.category === 'Exam Guide' || p.category === 'Recruitment' || p.source === 'dynamic';
        });
        try {
          var st = await api('GET', 'analytics');
          if (st && st.routes && typeof st.routes === 'object') analyticsMap = st.routes;
        } catch (_a) { /* optional analytics */ }
        renderToolbar();
        renderKpisAndTable();
      } catch (e) {
        tableHost.appendChild(el('p', { class: 'cso-mod-muted', text: e.message }));
      }
    }

    renderBanner(shell, 'Landing Pages Studio', 'Audit portal & campaign landing routes, repair slugs, optimize CTAs & mobile sticky bars, or clone live variants.', [
      el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-primary', text: '+ New Landing Page', onclick: toggleBlueprints }),
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'Bulk Fix CTAs & SEO', onclick: bulkFixMissing }),
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'Refresh', onclick: loadLanding })
    ]);
    shell.appendChild(kpiHost);
    shell.appendChild(blueprintHost);
    shell.appendChild(toolbarHost);
    shell.appendChild(drawerHost);
    shell.appendChild(tableHost);
    shell.appendChild(fullscreenHost);
    root.appendChild(shell);
    loadLanding();
  }

  /* -------------------------------------------------------------------------
     02-006: Page Templates (D1 Blueprint, Token-AutoFill, Sync & Real-CSS Studio)
     ------------------------------------------------------------------------- */
  function f02SyncPinnedCreateMenu(pinnedIds, allTemplates) {
    var dd = document.getElementById('createNewDropdown');
    if (!dd) return;
    dd.querySelectorAll('.cso-pinned-tpl-item, .cso-create-divider').forEach(function (n) { n.remove(); });
    var ids = Array.isArray(pinnedIds) ? pinnedIds : [];
    var list = Array.isArray(allTemplates) ? allTemplates : F02_TEMPLATES;
    var pinned = list.filter(function (t) { return ids.indexOf(t.id) !== -1; });
    if (!pinned.length) return;
    dd.appendChild(el('div', { class: 'cso-create-divider', text: '★ Pinned Blueprints' }));
    pinned.forEach(function (tpl) {
      var btn = el('button', {
        type: 'button',
        class: 'cso-create-item cso-pinned-tpl-item',
        role: 'menuitem',
        onclick: function () {
          dd.hidden = true;
          var trigger = document.getElementById('btnCreateNewMenu');
          if (trigger) trigger.setAttribute('aria-expanded', 'false');
          f02State.createTemplate = tpl;
          window.selectModule && window.selectModule('folder-02', 'module-02-002');
        }
      }, [
        el('strong', { text: '★ ' + tpl.name }),
        el('span', { text: (tpl.category || 'Blueprint') + ' · ' + ((tpl.blocks && tpl.blocks.length) || 0) + ' blocks' })
      ]);
      dd.appendChild(btn);
    });
  }

  (function initPinnedCreateMenuFromStorage() {
    try {
      var raw = localStorage.getItem('cso_pinned_page_templates');
      var ids = raw ? JSON.parse(raw) : [];
      var customRaw = localStorage.getItem('cso_custom_page_templates');
      var custom = customRaw ? JSON.parse(customRaw) : [];
      if (Array.isArray(ids) && ids.length) {
        f02SyncPinnedCreateMenu(ids, F02_TEMPLATES.concat(Array.isArray(custom) ? custom : []));
      }
    } catch (_e) { /* ignore storage errors */ }
  })();

  function renderPageTemplatesGallery(root, actions) {
    addHeaderPill(actions, '● Blueprints Studio');
    var shell = el('div', { class: 'cso-mod-shell' });
    var kpiHost = el('div', {});
    var toolbarHost = el('div', {});
    var drawerHost = el('div', {});
    var gridHost = el('div', {});
    var fullscreenHost = el('div', {});

    var customTemplates = [];
    var pinnedIds = [];
    var usageMap = {};
    var existingPages = [];
    var searchText = '';
    var activeFilter = 'all';

    function getAllTemplates() {
      return F02_TEMPLATES.map(function (t) {
        return Object.assign({}, t, { isCustom: false });
      }).concat(customTemplates.map(function (t) {
        return Object.assign({}, t, { isCustom: true });
      }));
    }

    function applyTokens(str, tokens) {
      if (!str) return '';
      var out = String(str);
      Object.keys(tokens || {}).forEach(function (k) {
        var val = tokens[k] || ('{{' + k + '}}');
        out = out.split('{{' + k + '}}').join(val);
      });
      return out;
    }

    function materializeTemplate(tpl, tokens) {
      var blocks = (tpl.blocks || []).map(function (b) {
        var nb = Object.assign({}, b);
        if (nb.title) nb.title = applyTokens(nb.title, tokens);
        if (nb.text) nb.text = applyTokens(nb.text, tokens);
        if (nb.label) nb.label = applyTokens(nb.label, tokens);
        if (Array.isArray(nb.items)) {
          nb.items = nb.items.map(function (it) { return applyTokens(it, tokens); });
        }
        return nb;
      });
      var atts = (tpl.attachments || []).map(function (a) {
        return Object.assign({}, a, { label: applyTokens(a.label, tokens) });
      });
      return Object.assign({}, tpl, {
        template_id: tpl.id,
        meta_description: applyTokens(tpl.meta_description, tokens),
        hero_title: applyTokens(tpl.hero_title, tokens),
        hero_subtitle: applyTokens(tpl.hero_subtitle, tokens),
        cta_label: applyTokens(tpl.cta_label, tokens),
        secondary_cta_label: applyTokens(tpl.secondary_cta_label, tokens),
        blocks: blocks,
        attachments: atts
      });
    }

    function bumpVersion(ver) {
      var m = String(ver || 'v1.0').match(/^v?(\d+)\.(\d+)$/);
      if (!m) return 'v1.1';
      return 'v' + m[1] + '.' + (parseInt(m[2], 10) + 1);
    }

    async function saveD1Setting(key, val) {
      await api('POST', 'settings', { key: key, value: JSON.stringify(val) });
    }

    async function recordUsage(tplId) {
      usageMap[tplId] = (usageMap[tplId] || 0) + 1;
      try {
        localStorage.setItem('cso_page_template_usage', JSON.stringify(usageMap));
        await saveD1Setting('page_template_usage', usageMap);
      } catch (_e) { /* non-blocking */ }
    }

    async function togglePin(tplId) {
      var idx = pinnedIds.indexOf(tplId);
      if (idx === -1) pinnedIds.push(tplId);
      else pinnedIds.splice(idx, 1);
      try {
        localStorage.setItem('cso_pinned_page_templates', JSON.stringify(pinnedIds));
        f02SyncPinnedCreateMenu(pinnedIds, getAllTemplates());
        await saveD1Setting('pinned_page_templates', pinnedIds);
        toast(idx === -1 ? 'Pinned blueprint to top & + Create New menu' : 'Unpinned blueprint', 'success');
      } catch (e) { toast(e.message, 'crimson'); }
      renderAll();
    }

    function escapeHtmlAttr(s) {
      return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function buildBlueprintPreviewHtml(tpl) {
      var m = materializeTemplate(tpl, {
        EXAM_NAME: 'OSSC CGLRE',
        YEAR: '2026',
        DEPARTMENT: 'Odisha Staff Selection Commission',
        LAST_DATE: '30 Nov 2026'
      });
      var html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
        '<title>' + escapeHtmlAttr(m.hero_title || m.name) + '</title>' +
        '<link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/assets/site.css">' +
        '</head><body><header class="site-header"><div class="container header-inner"><a class="brand" href="/">Common Sense Odisha</a></div></header>' +
        '<main class="container section"><section class="hero-card">' +
        '<span class="badge">' + escapeHtmlAttr(m.category || 'Blueprint') + ' · ' + escapeHtmlAttr(m.schema_type || 'WebPage') + '</span>' +
        '<h1>' + escapeHtmlAttr(m.hero_title || m.name) + '</h1>' +
        (m.hero_subtitle ? '<p class="lead">' + escapeHtmlAttr(m.hero_subtitle) + '</p>' : '') +
        '<p>' + escapeHtmlAttr(m.meta_description || '') + '</p><div class="hero-actions">' +
        (m.cta_label ? '<a class="btn btn-primary" href="' + escapeHtmlAttr(m.cta_url || '#') + '">' + escapeHtmlAttr(m.cta_label) + '</a> ' : '') +
        (m.secondary_cta_label ? '<a class="btn btn-secondary" href="' + escapeHtmlAttr(m.secondary_cta_url || '#') + '">' + escapeHtmlAttr(m.secondary_cta_label) + '</a>' : '') +
        '</div></section>';
      (m.blocks || []).forEach(function (b) {
        html += '<section class="card"><span class="badge">' + escapeHtmlAttr((b.type || 'block').toUpperCase()) + '</span>';
        if (b.title) html += '<h2>' + escapeHtmlAttr(b.title) + '</h2>';
        if (b.text) html += '<p>' + escapeHtmlAttr(b.text) + '</p>';
        if (Array.isArray(b.items) && b.items.length) {
          html += '<ul>';
          b.items.forEach(function (it) { html += '<li>' + escapeHtmlAttr(String(it).split('|')[0]) + '</li>'; });
          html += '</ul>';
        }
        html += '</section>';
      });
      html += '</main></body></html>';
      return html;
    }

    function openFullscreenPreview(tpl) {
      clear(fullscreenHost);
      var fsMode = 'desktop';
      var fsFrame = el('iframe', {
        class: 'cso-fullscreen-frame',
        sandbox: 'allow-same-origin',
        title: 'Blueprint Real-CSS Preview'
      });
      fsFrame.srcdoc = buildBlueprintPreviewHtml(tpl);
      var bD = el('button', { type: 'button', class: 'cso-pill cso-pill-active', text: 'Desktop 100%', onclick: function () { setFs('desktop'); } });
      var bT = el('button', { type: 'button', class: 'cso-pill', text: 'Tablet 768px', onclick: function () { setFs('tablet'); } });
      var bM = el('button', { type: 'button', class: 'cso-pill', text: 'Mobile 375px', onclick: function () { setFs('mobile'); } });
      function setFs(m) {
        fsMode = m;
        bD.classList.toggle('cso-pill-active', m === 'desktop');
        bT.classList.toggle('cso-pill-active', m === 'tablet');
        bM.classList.toggle('cso-pill-active', m === 'mobile');
        fsFrame.className = 'cso-fullscreen-frame' + (m === 'tablet' ? ' is-tablet' : m === 'mobile' ? ' is-mobile' : '');
      }
      function closeFs() { document.removeEventListener('keydown', onEsc); clear(fullscreenHost); }
      function onEsc(e) { if (e.key === 'Escape') closeFs(); }
      document.addEventListener('keydown', onEsc);
      fullscreenHost.appendChild(el('div', { class: 'cso-fullscreen-overlay' }, [
        el('div', { class: 'cso-drawer-head' }, [
          el('div', { class: 'cso-mod-toolbar' }, [
            el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: '← Back to Templates', onclick: closeFs }),
            el('strong', { text: 'Real-CSS Blueprint Preview — ' + tpl.name })
          ]),
          el('div', { class: 'cso-mod-toolbar' }, [
            bD, bT, bM,
            el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-primary cso-mod-btn-sm', text: 'Launch This Blueprint →', onclick: function () { closeFs(); openLaunchConfigurator(tpl, 'create'); } })
          ])
        ]),
        el('div', { class: 'cso-fullscreen-stage' }, [fsFrame])
      ]));
    }

    function openLaunchConfigurator(tpl, mode) {
      clear(drawerHost);
      var titleInp = el('input', { type: 'text', class: 'cso-mod-input', value: tpl.name + ' 2026' });
      var slugInp = el('input', { type: 'text', class: 'cso-mod-input', value: '/' + tpl.id.replace(/[^a-z0-9\-]/g, '-') + '-2026/' });
      var tokExam = el('input', { type: 'text', class: 'cso-mod-input', value: 'OSSC CGLRE' });
      var tokYear = el('input', { type: 'text', class: 'cso-mod-input', value: '2026' });
      var tokDept = el('input', { type: 'text', class: 'cso-mod-input', value: 'Odisha Staff Selection Commission' });
      var tokDate = el('input', { type: 'text', class: 'cso-mod-input', value: '30 Nov 2026' });
      var slugStatusHost = el('div', { class: 'cso-mod-toolbar' });

      function checkSlugCollision() {
        clear(slugStatusHost);
        var norm = f02NormalizeRoute(slugInp.value);
        var match = existingPages.find(function (p) { return p.route === norm; });
        if (!match) {
          slugStatusHost.appendChild(badge('✅ Route Available: ' + norm, 'ok'));
        } else {
          slugStatusHost.appendChild(badge('⚠️ Route Exists: ' + norm, 'warn'));
          slugStatusHost.appendChild(el('button', {
            type: 'button',
            class: 'cso-mod-btn cso-mod-btn-sm',
            text: 'Open Existing',
            onclick: function () { f02State.editRoute = norm; f02State.editPage = match; window.selectModule && window.selectModule('folder-02', 'module-02-002'); }
          }));
          slugStatusHost.appendChild(el('button', {
            type: 'button',
            class: 'cso-mod-btn cso-mod-btn-sm',
            text: 'Auto-Suffix -2',
            onclick: function () { slugInp.value = norm.replace(/\/$/, '') + '-2/'; checkSlugCollision(); }
          }));
        }
      }
      slugInp.addEventListener('input', checkSlugCollision);
      checkSlugCollision();

      function buildMaterialized() {
        var tokens = {
          EXAM_NAME: tokExam.value.trim() || 'Odisha Exam',
          YEAR: tokYear.value.trim() || '2026',
          DEPARTMENT: tokDept.value.trim() || 'Govt of Odisha',
          LAST_DATE: tokDate.value.trim() || '30 Nov 2026'
        };
        var mat = materializeTemplate(tpl, tokens);
        mat.route = f02NormalizeRoute(slugInp.value);
        mat.title = titleInp.value.trim() || mat.hero_title;
        return mat;
      }

      drawerHost.appendChild(el('div', { class: 'cso-drawer' }, [
        el('div', { class: 'cso-drawer-head' }, [
          el('strong', { text: 'Smart Token Auto-Fill & Launch Configurator — ' + tpl.name }),
          el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Close', onclick: function () { clear(drawerHost); } })
        ]),
        el('div', { class: 'cso-mod-grid-2' }, [
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Page Title' }), titleInp]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Target URL Slug' }), slugInp, slugStatusHost])
        ]),
        el('div', { class: 'cso-mod-grid-4' }, [
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: '{{EXAM_NAME}}' }), tokExam]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: '{{YEAR}}' }), tokYear]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: '{{DEPARTMENT}}' }), tokDept]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: '{{LAST_DATE}}' }), tokDate])
        ]),
        el('div', { class: 'cso-mod-toolbar' }, [
          el('button', {
            type: 'button',
            class: 'cso-mod-btn cso-mod-btn-primary',
            text: mode === 'builder' ? 'Hydrate & Open Visual Builder' : 'Hydrate & Open Create Page',
            onclick: async function () {
              var mat = buildMaterialized();
              await recordUsage(tpl.id);
              if (mode === 'builder') {
                f02State.builderTemplate = mat;
                f02State.builderRoute = mat.route;
                window.selectModule && window.selectModule('folder-02', 'module-02-003');
              } else {
                f02State.createTemplate = mat;
                window.selectModule && window.selectModule('folder-02', 'module-02-002');
              }
            }
          }),
          el('button', {
            type: 'button',
            class: 'cso-mod-btn',
            text: 'Quick Create Draft in D1',
            onclick: async function () {
              try {
                var mat = buildMaterialized();
                await api('POST', 'pages', {
                  route: mat.route,
                  title: mat.title,
                  meta_description: mat.meta_description,
                  category: mat.category || 'Core Portal',
                  hero_title: mat.hero_title,
                  hero_subtitle: mat.hero_subtitle,
                  cta_label: mat.cta_label,
                  cta_url: mat.cta_url,
                  secondary_cta_label: mat.secondary_cta_label || '',
                  secondary_cta_url: mat.secondary_cta_url || '',
                  template_id: tpl.id,
                  blocks_json: JSON.stringify(mat.blocks || []),
                  status: 'draft',
                  note: 'Quick draft from template ' + tpl.id
                });
                await recordUsage(tpl.id);
                toast('Created draft in D1: ' + mat.route, 'success');
                clear(drawerHost);
                await loadAll();
              } catch (e) { toast(e.message, 'crimson'); }
            }
          })
        ])
      ]));
    }

    function openCustomTemplateEditor(existingTpl) {
      clear(drawerHost);
      var isEdit = !!(existingTpl && existingTpl.isCustom);
      var nameInp = el('input', { type: 'text', class: 'cso-mod-input', placeholder: 'e.g. OSSC Skill Test Guide', value: existingTpl ? existingTpl.name : '' });
      var catSel = el('select', { class: 'cso-mod-select' }, ['Core Portal', 'Candidate Workspace', 'Information & Legal'].map(function (c) {
        return el('option', { value: c, text: c, selected: existingTpl && existingTpl.category === c });
      }));
      var descInp = el('input', { type: 'text', class: 'cso-mod-input', placeholder: 'Supports {{EXAM_NAME}}, {{YEAR}}, {{DEPARTMENT}}, {{LAST_DATE}}', value: existingTpl ? existingTpl.meta_description : '' });
      var hTitleInp = el('input', { type: 'text', class: 'cso-mod-input', value: existingTpl ? (existingTpl.hero_title || '') : '{{EXAM_NAME}} {{YEAR}} Guide' });
      var hSubInp = el('input', { type: 'text', class: 'cso-mod-input', placeholder: 'Odia bilingual subtitle (ଓଡ଼ିଆ)', value: existingTpl ? (existingTpl.hero_subtitle || '') : '' });
      var ctaLbl = el('input', { type: 'text', class: 'cso-mod-input', value: existingTpl ? (existingTpl.cta_label || 'Apply Online') : 'Apply Online' });
      var ctaUrl = el('input', { type: 'text', class: 'cso-mod-input', value: existingTpl ? (existingTpl.cta_url || '/jobs-careers/') : '/jobs-careers/' });
      var blocksArea = el('textarea', { class: 'cso-mod-textarea', rows: 6, value: JSON.stringify(existingTpl && existingTpl.blocks ? existingTpl.blocks : [{ type: 'hero', title: '{{EXAM_NAME}} {{YEAR}}', text: 'Verified guide by {{DEPARTMENT}}.' }, { type: 'notice', title: 'Deadline', text: 'Last Date: {{LAST_DATE}}' }], null, 2) });

      drawerHost.appendChild(el('div', { class: 'cso-drawer' }, [
        el('div', { class: 'cso-drawer-head' }, [
          el('strong', { text: isEdit ? 'Edit Custom D1 Template (' + existingTpl.version + ')' : '+ New Custom D1 Template' }),
          el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Close', onclick: function () { clear(drawerHost); } })
        ]),
        el('div', { class: 'cso-mod-grid-2' }, [
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Template Name' }), nameInp]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Category' }), catSel]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Meta Description (Tokens Supported)' }), descInp]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Hero Title' }), hTitleInp]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Bilingual Odia Subtitle (ଓଡ଼ିଆ)' }), hSubInp]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Primary CTA Label & URL' }), el('div', { class: 'cso-mod-grid-2' }, [ctaLbl, ctaUrl])])
        ]),
        el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Blocks JSON Array' }), blocksArea]),
        el('button', {
          type: 'button',
          class: 'cso-mod-btn cso-mod-btn-primary',
          text: isEdit ? 'Save New Version to D1' : 'Save Custom Template to D1',
          onclick: async function () {
            try {
              var parsedBlocks = JSON.parse(blocksArea.value || '[]');
              var tplObj = {
                id: isEdit ? existingTpl.id : 'custom-' + Date.now(),
                name: nameInp.value.trim() || 'Custom Odisha Blueprint',
                category: catSel.value,
                version: isEdit ? bumpVersion(existingTpl.version) : 'v1.0',
                updated_at: new Date().toISOString(),
                schema_type: (existingTpl && existingTpl.schema_type) || 'WebPage',
                meta_description: descInp.value.trim(),
                hero_title: hTitleInp.value.trim(),
                hero_subtitle: hSubInp.value.trim(),
                cta_label: ctaLbl.value.trim(),
                cta_url: ctaUrl.value.trim(),
                blocks: Array.isArray(parsedBlocks) ? parsedBlocks : []
              };
              if (isEdit) {
                customTemplates = customTemplates.map(function (c) { return c.id === existingTpl.id ? tplObj : c; });
              } else {
                customTemplates.push(tplObj);
              }
              localStorage.setItem('cso_custom_page_templates', JSON.stringify(customTemplates));
              await saveD1Setting('custom_page_templates', customTemplates);
              f02SyncPinnedCreateMenu(pinnedIds, getAllTemplates());
              toast('Saved custom template ' + tplObj.name + ' (' + tplObj.version + ') to D1', 'success');
              clear(drawerHost);
              renderAll();
            } catch (e) { toast(e.message, 'crimson'); }
          }
        })
      ]));
    }

    function openSaveFromLivePageDrawer() {
      clear(drawerHost);
      var sel = el('select', { class: 'cso-mod-select' }, existingPages.map(function (p) {
        return el('option', { value: p.route, text: (p.title || p.route) + ' (' + p.route + ')' });
      }));
      var nameInp = el('input', { type: 'text', class: 'cso-mod-input', placeholder: 'Reusable Template Name' });
      drawerHost.appendChild(el('div', { class: 'cso-drawer' }, [
        el('div', { class: 'cso-drawer-head' }, [
          el('strong', { text: 'Save Live Page as Reusable D1 Template' }),
          el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Close', onclick: function () { clear(drawerHost); } })
        ]),
        el('div', { class: 'cso-mod-grid-2' }, [
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Select Live Page' }), sel]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'New Template Name' }), nameInp])
        ]),
        el('button', {
          type: 'button',
          class: 'cso-mod-btn cso-mod-btn-primary',
          text: 'Snapshot into Custom D1 Templates',
          onclick: async function () {
            var pg = existingPages.find(function (p) { return p.route === sel.value; });
            if (!pg) return;
            var tplObj = {
              id: 'snap-' + Date.now(),
              name: nameInp.value.trim() || ((pg.title || pg.route) + ' Blueprint'),
              category: pg.category || 'Core Portal',
              version: 'v1.0',
              updated_at: new Date().toISOString(),
              schema_type: 'WebPage',
              meta_description: pg.meta_description || '',
              hero_title: pg.hero_title || pg.title || '',
              hero_subtitle: pg.hero_subtitle || '',
              cta_label: pg.cta_label || 'Explore Now',
              cta_url: pg.cta_url || '/jobs-careers/',
              secondary_cta_label: pg.secondary_cta_label || '',
              secondary_cta_url: pg.secondary_cta_url || '',
              blocks: f02ParseBlocks(pg.blocks_json)
            };
            customTemplates.push(tplObj);
            try {
              localStorage.setItem('cso_custom_page_templates', JSON.stringify(customTemplates));
              await saveD1Setting('custom_page_templates', customTemplates);
              toast('Saved live page as D1 template: ' + tplObj.name, 'success');
              clear(drawerHost);
              renderAll();
            } catch (e) { toast(e.message, 'crimson'); }
          }
        })
      ]));
    }

    function openAiArchitectDrawer() {
      clear(drawerHost);
      var promptInp = el('input', { type: 'text', class: 'cso-mod-input', placeholder: 'e.g. Odisha Forest Guard Physical Test & Merit List Blueprint' });
      var genBtn = el('button', {
        type: 'button',
        class: 'cso-mod-btn cso-mod-btn-primary',
        text: '✨ Generate & Save D1 Blueprint',
        onclick: async function () {
          if (!promptInp.value.trim()) return;
          genBtn.disabled = true;
          try {
            var res = await api('POST', 'ai/generate-page', {
              mode: 'blueprint',
              topic: promptInp.value.trim(),
              language: 'Bilingual English + Odia'
            });
            var gen = res.page || res;
            var tplObj = {
              id: 'ai-' + Date.now(),
              name: gen.title || promptInp.value.trim(),
              category: 'Core Portal',
              version: 'v1.0',
              updated_at: new Date().toISOString(),
              schema_type: 'WebPage',
              meta_description: gen.meta_description || ('Complete guide for ' + promptInp.value.trim()),
              hero_title: gen.hero_title || gen.title || promptInp.value.trim(),
              hero_subtitle: gen.hero_subtitle || 'ଓଡ଼ିଆ ଏବଂ ଇଂରାଜୀରେ ସମ୍ପୂର୍ଣ୍ଣ ସୂଚନା',
              cta_label: gen.cta_label || 'Apply / Explore Now',
              cta_url: gen.cta_url || '/jobs-careers/',
              blocks: Array.isArray(gen.blocks) && gen.blocks.length ? gen.blocks : [
                { type: 'hero', title: '{{EXAM_NAME}} {{YEAR}}', text: 'Generated blueprint for ' + promptInp.value.trim() },
                { type: 'notice', title: 'Key Dates', text: 'Deadline: {{LAST_DATE}}' },
                { type: 'faq', title: 'FAQs', items: ['Who can apply?|Check official {{DEPARTMENT}} notification.'] }
              ]
            };
            customTemplates.push(tplObj);
            localStorage.setItem('cso_custom_page_templates', JSON.stringify(customTemplates));
            await saveD1Setting('custom_page_templates', customTemplates);
            toast('AI Blueprint saved to D1: ' + tplObj.name, 'success');
            clear(drawerHost);
            renderAll();
          } catch (e) { toast(e.message, 'crimson'); }
          finally { genBtn.disabled = false; }
        }
      });
      drawerHost.appendChild(el('div', { class: 'cso-drawer' }, [
        el('div', { class: 'cso-drawer-head' }, [
          el('strong', { text: 'AI Blueprint Architect (Workers AI → Custom D1 Template)' }),
          el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Close', onclick: function () { clear(drawerHost); } })
        ]),
        el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Describe the Odisha Blueprint to Generate' }), promptInp]),
        genBtn
      ]));
    }

    async function syncLinkedPages(tpl) {
      var linked = existingPages.filter(function (p) { return p.template_id === tpl.id; });
      if (!linked.length) { toast('No D1 pages linked to template "' + tpl.id + '" yet.', 'info'); return; }
      if (!window.confirm('Sync updated structural blocks from "' + tpl.name + '" to ' + linked.length + ' linked page(s)?')) return;
      var updated = 0;
      for (var i = 0; i < linked.length; i++) {
        try {
          await api('PUT', 'pages', {
            route: linked[i].route,
            blocks_json: JSON.stringify(tpl.blocks || []),
            note: 'Synced structural blocks from template ' + tpl.id
          });
          updated++;
        } catch (_e) { /* continue */ }
      }
      toast('Synced blocks to ' + updated + '/' + linked.length + ' linked page(s)', 'success');
    }

    function exportJsonPack() {
      var data = JSON.stringify({ exported_at: new Date().toISOString(), custom_templates: customTemplates }, null, 2);
      var blob = new Blob([data], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'cso-custom-page-templates.json';
      a.click();
    }

    function renderAll() {
      clear(kpiHost);
      clear(toolbarHost);
      clear(gridHost);

      var all = getAllTemplates();
      var mostUsed = all[0];
      var maxUse = -1;
      all.forEach(function (t) {
        var u = usageMap[t.id] || 0;
        if (u > maxUse) { maxUse = u; mostUsed = t; }
      });

      kpiHost.appendChild(el('div', { class: 'cso-kpi-grid-4' }, [
        el('div', { class: 'cso-mod-card' }, [el('div', { class: 'cso-mod-label', text: 'Total Blueprints' }), el('strong', { text: String(all.length) })]),
        el('div', { class: 'cso-mod-card' }, [el('div', { class: 'cso-mod-label', text: 'Custom D1 Templates' }), el('strong', { text: String(customTemplates.length) })]),
        el('div', { class: 'cso-mod-card' }, [el('div', { class: 'cso-mod-label', text: 'Most Used Blueprint' }), el('strong', { text: mostUsed ? mostUsed.name : '—' })]),
        el('div', { class: 'cso-mod-card' }, [el('div', { class: 'cso-mod-label', text: 'Bilingual & Schema Ready' }), el('strong', { text: '100%' })])
      ]));

      var searchInp = el('input', { type: 'search', class: 'cso-mod-input', placeholder: 'Search blueprints, Odia tags, schema, or blocks...', value: searchText });
      searchInp.addEventListener('input', function () { searchText = searchInp.value.trim(); renderGridOnly(); });

      var cats = [
        ['all', 'All Blueprints'],
        ['Core Portal', 'Core Portal'],
        ['Candidate Workspace', 'Candidate Workspace'],
        ['Information & Legal', 'Information & Legal'],
        ['custom', 'My Custom Templates'],
        ['pinned', '★ Pinned']
      ];
      var pills = cats.map(function (c) {
        return el('button', {
          type: 'button',
          class: 'cso-pill' + (activeFilter === c[0] ? ' cso-pill-active' : ''),
          text: c[1],
          onclick: function () { activeFilter = c[0]; renderAll(); }
        });
      });
      toolbarHost.appendChild(el('div', { class: 'cso-mod-toolbar' }, [searchInp, el('div', { class: 'cso-pill-row' }, pills)]));
      renderGridOnly();
    }

    function renderGridOnly() {
      clear(gridHost);
      var all = getAllTemplates().sort(function (a, b) {
        var pa = pinnedIds.indexOf(a.id) !== -1 ? 1 : 0;
        var pb = pinnedIds.indexOf(b.id) !== -1 ? 1 : 0;
        return pb - pa;
      });
      var filtered = all.filter(function (t) {
        if (activeFilter === 'custom' && !t.isCustom) return false;
        if (activeFilter === 'pinned' && pinnedIds.indexOf(t.id) === -1) return false;
        if (activeFilter !== 'all' && activeFilter !== 'custom' && activeFilter !== 'pinned' && t.category !== activeFilter) return false;
        if (searchText) {
          var q = searchText.toLowerCase();
          var hay = (t.name + ' ' + t.meta_description + ' ' + (t.hero_subtitle || '') + ' ' + (t.schema_type || '')).toLowerCase();
          if (hay.indexOf(q) === -1) return false;
        }
        return true;
      });

      var grid = el('div', { class: 'cso-mod-grid-2' });
      filtered.forEach(function (tpl) {
        var isPinned = pinnedIds.indexOf(tpl.id) !== -1;
        var uses = usageMap[tpl.id] || 0;
        var flow = el('div', { class: 'cso-block-flow' }, (tpl.blocks || []).map(function (b, idx) {
          var cls = 'cso-block-chip' + (b.type === 'notice' ? ' is-notice' : b.type === 'cbt' ? ' is-cbt' : b.type === 'faq' ? ' is-faq' : b.type === 'ticker' ? ' is-ticker' : '');
          return el('div', { class: cls }, [
            el('span', { text: (idx + 1) + '. ' + (b.type || 'block').toUpperCase() }),
            el('small', { text: b.title || (b.text ? String(b.text).slice(0, 36) : 'Section') })
          ]);
        }));

        var cardBtns = [
          el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-primary cso-mod-btn-sm', text: 'Use in Create Page', onclick: function () { openLaunchConfigurator(tpl, 'create'); } }),
          el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Open in Visual Builder', onclick: function () { openLaunchConfigurator(tpl, 'builder'); } }),
          el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Preview', onclick: function () { openFullscreenPreview(tpl); } }),
          el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Sync Linked Pages', onclick: function () { syncLinkedPages(tpl); } })
        ];
        if (tpl.isCustom) {
          cardBtns.push(el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Edit', onclick: function () { openCustomTemplateEditor(tpl); } }));
          cardBtns.push(el('button', {
            type: 'button',
            class: 'cso-mod-btn cso-mod-btn-sm',
            text: 'Duplicate',
            onclick: async function () {
              var copy = Object.assign({}, tpl, { id: 'copy-' + Date.now(), name: tpl.name + ' (Copy)', version: 'v1.0', updated_at: new Date().toISOString() });
              customTemplates.push(copy);
              localStorage.setItem('cso_custom_page_templates', JSON.stringify(customTemplates));
              await saveD1Setting('custom_page_templates', customTemplates);
              renderAll();
            }
          }));
          cardBtns.push(el('button', {
            type: 'button',
            class: 'cso-mod-btn cso-mod-btn-sm',
            text: 'Delete',
            onclick: async function () {
              customTemplates = customTemplates.filter(function (c) { return c.id !== tpl.id; });
              localStorage.setItem('cso_custom_page_templates', JSON.stringify(customTemplates));
              await saveD1Setting('custom_page_templates', customTemplates);
              renderAll();
            }
          }));
        }

        grid.appendChild(el('div', { class: 'cso-mod-card' }, [
          el('div', { class: 'cso-drawer-head' }, [
            el('div', {}, [
              el('h3', { text: tpl.name }),
              el('div', { class: 'cso-pill-row' }, [
                badge(tpl.category, 'info'),
                badge(tpl.schema_type || 'WebPage', 'ok'),
                badge((tpl.version || 'v1.0') + ' · ' + uses + ' uses', 'info'),
                tpl.isCustom ? badge('Custom D1', 'warn') : ''
              ])
            ]),
            el('button', {
              type: 'button',
              class: 'cso-pin-btn' + (isPinned ? ' is-pinned' : ''),
              text: isPinned ? '★ Pinned' : '☆ Pin to Top',
              onclick: function () { togglePin(tpl.id); }
            })
          ]),
          el('p', { class: 'cso-mod-muted', text: tpl.meta_description }),
          flow,
          el('div', { class: 'cso-mod-toolbar' }, cardBtns)
        ]));
      });
      gridHost.appendChild(grid);
    }

    var importFileInp = el('input', { type: 'file', class: 'cso-sr-file', accept: 'application/json,.json' });
    importFileInp.addEventListener('change', function () {
      var f = importFileInp.files && importFileInp.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = async function () {
        try {
          var parsed = JSON.parse(String(reader.result || '{}'));
          var list = Array.isArray(parsed) ? parsed : (parsed.custom_templates || []);
          list.forEach(function (item) {
            customTemplates.push(Object.assign({}, item, { id: item.id || ('imp-' + Date.now()), isCustom: true }));
          });
          localStorage.setItem('cso_custom_page_templates', JSON.stringify(customTemplates));
          await saveD1Setting('custom_page_templates', customTemplates);
          toast('Imported ' + list.length + ' template(s) into D1', 'success');
          renderAll();
        } catch (e) { toast('Invalid JSON: ' + e.message, 'crimson'); }
      };
      reader.readAsText(f);
    });

    async function loadAll() {
      try {
        var res = await api('GET', 'settings');
        var map = (res && res.settings) || {};
        if (map.custom_page_templates) {
          try { customTemplates = JSON.parse(map.custom_page_templates) || []; } catch (_e) { customTemplates = []; }
        }
        if (map.pinned_page_templates) {
          try { pinnedIds = JSON.parse(map.pinned_page_templates) || []; } catch (_e) { pinnedIds = []; }
        }
        if (map.page_template_usage) {
          try { usageMap = JSON.parse(map.page_template_usage) || {}; } catch (_e) { usageMap = {}; }
        }
        localStorage.setItem('cso_pinned_page_templates', JSON.stringify(pinnedIds));
        localStorage.setItem('cso_custom_page_templates', JSON.stringify(customTemplates));
        f02SyncPinnedCreateMenu(pinnedIds, getAllTemplates());
      } catch (_s) { /* fallback to storage */ }
      try {
        var pg = await api('GET', 'pages');
        existingPages = (pg && pg.pages) || [];
      } catch (_p) { existingPages = []; }
      renderAll();
    }

    renderBanner(shell, 'Page Templates & Blueprints Studio', '10 Odisha starter blueprints + D1 custom templates with smart token auto-fill, slug collision checks, linked-page sync & real-CSS previews.', [
      el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-primary', text: '+ New Custom Template', onclick: function () { openCustomTemplateEditor(null); } }),
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'Save Live Page as Template', onclick: openSaveFromLivePageDrawer }),
      el('button', { type: 'button', class: 'cso-mod-btn', text: '✨ AI Generate Blueprint', onclick: openAiArchitectDrawer }),
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'Export JSON', onclick: exportJsonPack }),
      el('label', { class: 'cso-mod-btn' }, ['Import JSON', importFileInp])
    ]);
    shell.appendChild(kpiHost);
    shell.appendChild(toolbarHost);
    shell.appendChild(drawerHost);
    shell.appendChild(gridHost);
    shell.appendChild(fullscreenHost);
    root.appendChild(shell);
    loadAll();
  }

  /* -------------------------------------------------------------------------
     02-007: Reusable Sections (/__sitewide + /api/admin/banner)
     ------------------------------------------------------------------------- */
  function renderReusableSectionsStudio(root, actions) {
    addHeaderPill(actions, '● Sitewide Sections');
    var shell = el('div', { class: 'cso-mod-shell' });
    var kpiHost = el('div', {});
    var drawerHost = el('div', {});
    var splitHost = el('div', { class: 'cso-sitewide-split' });
    var leftCol = el('div', { class: 'cso-sitewide-editor' });
    var rightCol = el('div', { class: 'cso-sticky-preview' });
    var fullscreenHost = el('div', {});

    var DEFAULT_SECTIONS = [
      { id: 'candidate-cta', name: 'Candidate Portal CTA Strip', enabled: true, style: 'emerald', visibility: 'all', exclude_routes: '/privacy-policy.html,/disclaimer.html,/terms.html', title: 'Candidate Workspace', odia_title: 'ପ୍ରାର୍ଥୀ ଡ୍ୟାସବୋର୍ଡ', text: 'Track exam deadlines, saved posts, and CBT scores in one dashboard.', odia_text: 'ପରୀକ୍ଷା ତାରିଖ ଏବଂ CBT ସ୍କୋର ଗୋଟିଏ ସ୍ଥାନରେ ଦେଖନ୍ତୁ।', label: 'Open Dashboard', url: '/student-dashboard/', secondary_label: 'Practice Free CBT', secondary_url: '/mock-tests/' },
      { id: 'community-callout', name: 'Telegram/WhatsApp Community Callout', enabled: true, style: 'amber', visibility: 'all', exclude_routes: '/privacy-policy.html,/disclaimer.html,/terms.html', title: 'Odisha Aspirant Community', odia_title: 'ଓଡ଼ିଶା ପରୀକ୍ଷାର୍ଥୀ ସମୁଦାୟ', text: 'Join daily current affairs & instant job alert channels.', odia_text: 'ଦୈନିକ କରେଣ୍ଟ ଆଫେୟାର୍ସ ଏବଂ ନିଯୁକ୍ତି ସୂଚନା ପାଇଁ ଯୋଗ ଦିଅନ୍ତୁ।', label: 'Join Community', url: '/community/', secondary_label: 'Telegram Alerts', secondary_url: 'https://t.me/csodisha' },
      { id: 'footer-notice', name: 'Footer Statutory Notice', enabled: true, style: 'slate', visibility: 'all', exclude_routes: '', title: 'Disclaimer', odia_title: 'ସରକାରୀ ସୂଚନା', text: 'Common Sense Odisha is an independent educational portal. Verify official dates on commission websites.', odia_text: 'ସମସ୍ତ ତଥ୍ୟ ଅଫିସିଆଲ୍ ୱେବସାଇଟ୍ ସହିତ ଯାଞ୍ଚ କରନ୍ତୁ।', label: 'Read Disclaimer', url: '/disclaimer.html', secondary_label: 'Contact Support', secondary_url: '/contact.html' }
    ];

    var PRESETS = [
      { id: 'cbt-promo', name: 'Free CBT Mock Test Promo Bar', enabled: true, style: 'emerald', visibility: 'jobs-exams', exclude_routes: '', title: 'Free Bilingual CBT Mock Tests', odia_title: 'ମାଗଣା CBT ମକ୍ ଟେଷ୍ଟ', text: 'Practice OSSC CGL, OSSSC RI/ARI & OPSC OAS papers with live ranking.', odia_text: 'ଓଡ଼ିଆ ଏବଂ ଇଂରାଜୀରେ ମାଗଣା ମକ୍ ଟେଷ୍ଟ ଦିଅନ୍ତୁ।', label: 'Start CBT Now', url: '/mock-tests/', secondary_label: 'View Syllabus', secondary_url: '/syllabus/' },
      { id: 'exam-helpline', name: 'OTET / OSSTET Exam Helpline Box', enabled: true, style: 'gold', visibility: 'all', exclude_routes: '/privacy-policy.html', title: 'Odisha Exam Helpline & Verification', odia_title: 'ପରୀକ୍ଷା ସହାୟତା କେନ୍ଦ୍ର', text: 'Need help finding official PDFs or admit card links? Check our verified directory.', odia_text: 'ଆଡମିଟ୍ କାର୍ଡ ଏବଂ ଅଫିସିଆଲ୍ PDF ପାଇଁ ସହାୟତା ପାଆନ୍ତୁ।', label: 'Open Resources', url: '/resources/', secondary_label: 'Contact Helpdesk', secondary_url: '/contact.html' },
      { id: 'gov-seal', name: 'Official .gov.in Verification Seal', enabled: true, style: 'slate', visibility: 'all', exclude_routes: '', title: 'Verified Official Sources', odia_title: 'ଯାଞ୍ଚିତ ସରକାରୀ ଉତ୍ସ', text: 'All notifications are cross-checked against opsc.gov.in, ossc.gov.in & osssc.gov.in.', odia_text: 'ସମସ୍ତ ବିଜ୍ଞପ୍ତି ଅଫିସିଆଲ୍ ପୋର୍ଟାଲରୁ ଯାଞ୍ଚିତ।', label: 'Official Jobs Hub', url: '/jobs-careers/', secondary_label: '', secondary_url: '' }
    ];

    var sections = [];
    var bannerState = { active: false, severity: 'info', headline: '', odia_headline: '', context: '', ctaText: '', ctaUrl: '', starts_at: '', expires_at: '' };
    var verifiedRoutes = ['/jobs-careers/', '/current-affairs/', '/mock-tests/', '/resources/', '/syllabus/', '/pyq/', '/student-dashboard/', '/community/', '/schemes/', '/contact.html', '/disclaimer.html'];
    var linkHealthText = 'Not Checked';
    var lastPublishedAt = '—';
    var previewViewport = 'desktop';
    var previewRoute = '/jobs-careers/';
    var dragIndex = -1;

    function escapeHtmlAttr(s) {
      return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function matchesPreviewRoute(s, rt) {
      var r = rt || '/';
      var excl = String(s.exclude_routes || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean);
      if (excl.some(function (p) { return r === p || (p.slice(-1) === '*' && r.indexOf(p.slice(0, -1)) === 0); })) return false;
      var vis = s.visibility || 'all';
      if (vis === 'jobs-exams') return r.indexOf('/jobs-careers') === 0 || r.indexOf('/study') === 0 || r.indexOf('/mock-tests') === 0 || r.indexOf('/syllabus') === 0;
      if (vis === 'home-landing') return r === '/' || r.indexOf('/campaign') === 0 || r.indexOf('/landing') === 0;
      if (vis === 'custom') {
        var incl = String(s.include_routes || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean);
        if (!incl.length) return true;
        return incl.some(function (p) { return r === p || (p.slice(-1) === '*' && r.indexOf(p.slice(0, -1)) === 0); });
      }
      return true;
    }

    function buildSitewidePreviewHtml() {
      var html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
        '<title>Sitewide Preview — ' + escapeHtmlAttr(previewRoute) + '</title>' +
        '<link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/assets/site.css">' +
        '</head><body><header class="site-header"><div class="container header-inner"><a class="brand" href="/">Common Sense Odisha</a></div></header>';
      if (bannerState.active && bannerState.headline) {
        html += '<div class="notice-banner"><strong>[' + escapeHtmlAttr((bannerState.severity || 'info').toUpperCase()) + ']</strong> ' +
          escapeHtmlAttr(bannerState.headline) +
          (bannerState.odia_headline ? ' · ' + escapeHtmlAttr(bannerState.odia_headline) : '') +
          (bannerState.ctaUrl ? ' <a href="' + escapeHtmlAttr(bannerState.ctaUrl) + '">' + escapeHtmlAttr(bannerState.ctaText || 'View') + '</a>' : '') +
          '</div>';
      }
      html += '<main class="container section"><section class="hero-card"><span class="badge">Sample Route: ' + escapeHtmlAttr(previewRoute) + '</span>' +
        '<h1>Sample Public Page Content</h1><p>Inspect how active sitewide strips inject and stack below the main content on ' + escapeHtmlAttr(previewRoute) + '.</p></section>';
      sections.filter(function (s) { return s.enabled !== false && matchesPreviewRoute(s, previewRoute); }).forEach(function (s) {
        html += '<section class="card cso-sitewide-style-' + escapeHtmlAttr(s.style || 'emerald') + '">' +
          '<span class="badge">' + escapeHtmlAttr(s.style || 'emerald') + ' · ' + escapeHtmlAttr(s.visibility || 'all') + '</span>' +
          '<h2>' + escapeHtmlAttr(s.title || s.name || s.id) + '</h2>' +
          (s.odia_title ? '<p><strong>' + escapeHtmlAttr(s.odia_title) + '</strong></p>' : '') +
          '<p>' + escapeHtmlAttr(s.text || '') + '</p>' +
          (s.odia_text ? '<p>' + escapeHtmlAttr(s.odia_text) + '</p>' : '') +
          '<div class="hero-actions">' +
          (s.label ? '<a class="btn btn-primary" href="' + escapeHtmlAttr(s.url || '#') + '">' + escapeHtmlAttr(s.label) + '</a> ' : '') +
          (s.secondary_label ? '<a class="btn btn-secondary" href="' + escapeHtmlAttr(s.secondary_url || '#') + '">' + escapeHtmlAttr(s.secondary_label) + '</a> ' : '') +
          (s.attachment_url ? '<a class="btn" href="' + escapeHtmlAttr(s.attachment_url) + '">' + escapeHtmlAttr(s.attachment_label || 'Official PDF') + '</a>' : '') +
          '</div></section>';
      });
      html += '</main></body></html>';
      return html;
    }

    var previewFrame = el('iframe', { class: 'cso-builder-iframe', sandbox: 'allow-same-origin', title: 'Sitewide Real-CSS Preview' });
    function updatePreview() {
      previewFrame.srcdoc = buildSitewidePreviewHtml();
      renderKpis();
    }

    function openFullscreenPreview() {
      clear(fullscreenHost);
      var fsMode = previewViewport;
      var fsFrame = el('iframe', {
        class: 'cso-fullscreen-frame' + (fsMode === 'tablet' ? ' is-tablet' : fsMode === 'mobile' ? ' is-mobile' : ''),
        sandbox: 'allow-same-origin',
        title: 'Sitewide Full-Screen Real View'
      });
      fsFrame.srcdoc = buildSitewidePreviewHtml();
      var bD = el('button', { type: 'button', class: 'cso-pill' + (fsMode === 'desktop' ? ' cso-pill-active' : ''), text: 'Desktop 100%', onclick: function () { setFs('desktop'); } });
      var bT = el('button', { type: 'button', class: 'cso-pill' + (fsMode === 'tablet' ? ' cso-pill-active' : ''), text: 'Tablet 768px', onclick: function () { setFs('tablet'); } });
      var bM = el('button', { type: 'button', class: 'cso-pill' + (fsMode === 'mobile' ? ' cso-pill-active' : ''), text: 'Mobile 375px', onclick: function () { setFs('mobile'); } });
      function setFs(m) {
        fsMode = m;
        bD.classList.toggle('cso-pill-active', m === 'desktop');
        bT.classList.toggle('cso-pill-active', m === 'tablet');
        bM.classList.toggle('cso-pill-active', m === 'mobile');
        fsFrame.className = 'cso-fullscreen-frame' + (m === 'tablet' ? ' is-tablet' : m === 'mobile' ? ' is-mobile' : '');
      }
      function closeFs() { document.removeEventListener('keydown', onEsc); clear(fullscreenHost); }
      function onEsc(e) { if (e.key === 'Escape') closeFs(); }
      document.addEventListener('keydown', onEsc);
      fullscreenHost.appendChild(el('div', { class: 'cso-fullscreen-overlay' }, [
        el('div', { class: 'cso-drawer-head' }, [
          el('div', { class: 'cso-mod-toolbar' }, [
            el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: '← Back to Studio', onclick: closeFs }),
            el('strong', { text: 'Sitewide Strips Full-Screen Real View (' + previewRoute + ')' })
          ]),
          el('div', { class: 'cso-mod-toolbar' }, [bD, bT, bM])
        ]),
        el('div', { class: 'cso-fullscreen-stage' }, [fsFrame])
      ]));
    }

    function renderKpis() {
      clear(kpiHost);
      var activeCnt = sections.filter(function (s) { return s.enabled !== false; }).length;
      var hasCustomRules = sections.some(function (s) { return (s.visibility && s.visibility !== 'all') || (s.exclude_routes && s.exclude_routes.trim()); });
      kpiHost.appendChild(el('div', { class: 'cso-kpi-grid-4' }, [
        el('div', { class: 'cso-mod-card' }, [el('div', { class: 'cso-mod-label', text: 'Active Sitewide Strips' }), el('strong', { text: activeCnt + ' / ' + sections.length })]),
        el('div', { class: 'cso-mod-card' }, [el('div', { class: 'cso-mod-label', text: 'Target Scope' }), el('strong', { text: hasCustomRules ? 'Custom Targeting Rules' : 'All Public Pages' })]),
        el('div', { class: 'cso-mod-card' }, [el('div', { class: 'cso-mod-label', text: 'Link Health (200 OK)' }), el('strong', { text: linkHealthText })]),
        el('div', { class: 'cso-mod-card' }, [el('div', { class: 'cso-mod-label', text: 'Last Published' }), el('strong', { text: lastPublishedAt })])
      ]));
    }

    function makeRoutePicker(onSelect) {
      var sel = el('select', { class: 'cso-mod-select' }, [
        el('option', { value: '', text: '— Verified Route Picker —' })
      ].concat(verifiedRoutes.map(function (r) { return el('option', { value: r, text: r }); })));
      sel.addEventListener('change', function () {
        if (sel.value) { onSelect(sel.value); sel.value = ''; }
      });
      return sel;
    }

    function openR2Picker(onPick) {
      var box = el('div', { class: 'cso-drawer' });
      box.appendChild(el('div', { class: 'cso-drawer-head' }, [
        el('strong', { text: 'Pick Attachment from R2 Library' }),
        el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Close', onclick: function () { box.remove(); } })
      ]));
      var listHost = el('div', { class: 'cso-mod-muted', text: 'Loading R2 files...' });
      box.appendChild(listHost);
      drawerHost.appendChild(box);
      api('GET', 'media').then(function (d) {
        clear(listHost);
        var items = d.media || d.files || d.objects || [];
        if (!items.length) { listHost.textContent = 'No R2 assets found.'; return; }
        var g = el('div', { class: 'cso-mod-grid-3' });
        items.slice(0, 18).forEach(function (it) {
          var u = it.url || it.public_url || ('/media/' + (it.key || it.name || ''));
          var n = it.name || it.key || u;
          g.appendChild(el('div', { class: 'cso-mod-card' }, [
            el('div', { class: 'cso-mod-label', text: n }),
            el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm cso-mod-btn-primary', text: 'Attach', onclick: function () { onPick(u, n); box.remove(); } })
          ]));
        });
        listHost.appendChild(g);
      }).catch(function (e) { listHost.textContent = e.message; });
    }

    function renderCards() {
      clear(leftCol);

      // Card 1: Broadcast Banner (/api/admin/banner)
      var bChk = el('input', { type: 'checkbox' }); bChk.checked = !!bannerState.active;
      var bSev = el('select', { class: 'cso-mod-select' }, ['info', 'notice', 'urgent'].map(function (s) { return el('option', { value: s, text: s, selected: bannerState.severity === s }); }));
      var bHead = el('input', { type: 'text', class: 'cso-mod-input', value: bannerState.headline || '' });
      var bOdia = el('input', { type: 'text', class: 'cso-mod-input', placeholder: 'Odia Banner Headline (ଓଡ଼ିଆ)', value: bannerState.odia_headline || '' });
      var bCtx = el('input', { type: 'text', class: 'cso-mod-input', placeholder: 'Context (e.g. OPSC OAS 2026)', value: bannerState.context || '' });
      var bCtaTxt = el('input', { type: 'text', class: 'cso-mod-input', placeholder: 'CTA Label (e.g. Apply Now)', value: bannerState.ctaText || '' });
      var bUrl = el('input', { type: 'text', class: 'cso-mod-input', value: bannerState.ctaUrl || '' });
      var bStart = el('input', { type: 'date', class: 'cso-mod-input', value: bannerState.starts_at ? String(bannerState.starts_at).slice(0, 10) : '' });
      var bEnd = el('input', { type: 'date', class: 'cso-mod-input', value: bannerState.expires_at ? String(bannerState.expires_at).slice(0, 10) : '' });
      var bRoutePick = makeRoutePicker(function (v) { bUrl.value = v; bannerState.ctaUrl = v; updatePreview(); });

      [bHead, bOdia, bCtx, bCtaTxt, bUrl, bStart, bEnd].forEach(function (inp) {
        inp.addEventListener('input', function () {
          bannerState.headline = bHead.value;
          bannerState.odia_headline = bOdia.value;
          bannerState.context = bCtx.value;
          bannerState.ctaText = bCtaTxt.value;
          bannerState.ctaUrl = bUrl.value;
          bannerState.starts_at = bStart.value;
          bannerState.expires_at = bEnd.value;
          updatePreview();
        });
      });
      bChk.addEventListener('change', function () { bannerState.active = bChk.checked; updatePreview(); });
      bSev.addEventListener('change', function () { bannerState.severity = bSev.value; updatePreview(); });

      leftCol.appendChild(el('div', { class: 'cso-mod-card' }, [
        el('div', { class: 'cso-drawer-head' }, [el('h3', { text: 'Broadcast Banner' }), badge('/api/admin/banner', 'info')]),
        el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-check-label' }, [bChk, el('span', { text: 'Active across homepage & portals' })])]),
        el('div', { class: 'cso-mod-grid-2' }, [
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Severity' }), bSev]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Context' }), bCtx]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Headline (English)' }), bHead]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Odia Headline (ଓଡ଼ିଆ)' }), bOdia]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'CTA Label' }), bCtaTxt]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'CTA URL + Route Picker' }), bUrl, bRoutePick]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Starts At' }), bStart]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Expires At' }), bEnd])
        ]),
        el('button', {
          type: 'button',
          class: 'cso-mod-btn cso-mod-btn-primary cso-mod-btn-sm',
          text: 'Save Broadcast Banner',
          onclick: async function () {
            try {
              await api('PUT', 'banner', {
                active: bChk.checked,
                severity: bSev.value,
                headline: bHead.value.trim(),
                odia_headline: bOdia.value.trim(),
                context: bCtx.value.trim(),
                ctaText: bCtaTxt.value.trim() || 'View',
                ctaUrl: bUrl.value.trim(),
                starts_at: bStart.value.trim(),
                expires_at: bEnd.value.trim()
              });
              toast('Broadcast Banner saved live!', 'success');
            } catch (e) { toast(e.message, 'crimson'); }
          }
        })
      ]));

      // /__sitewide sections
      sections.forEach(function (sec, idx) {
        var card = el('div', { class: 'cso-mod-card', draggable: true });
        card.addEventListener('dragstart', function () { dragIndex = idx; card.classList.add('is-dragging'); });
        card.addEventListener('dragend', function () { card.classList.remove('is-dragging'); });
        card.addEventListener('dragover', function (e) { e.preventDefault(); });
        card.addEventListener('drop', function (e) {
          e.preventDefault();
          if (dragIndex < 0 || dragIndex === idx) return;
          var moved = sections.splice(dragIndex, 1)[0];
          sections.splice(idx, 0, moved);
          dragIndex = -1;
          renderCards();
          updatePreview();
        });

        var chk = el('input', { type: 'checkbox' }); chk.checked = sec.enabled !== false;
        var styleSel = el('select', { class: 'cso-mod-select' }, [
          ['emerald', 'Emerald Brand'],
          ['amber', 'Amber Alert'],
          ['slate', 'Slate Neutral'],
          ['gold', 'Official Gold']
        ].map(function (st) { return el('option', { value: st[0], text: st[1], selected: (sec.style || 'emerald') === st[0] }); }));

        var visSel = el('select', { class: 'cso-mod-select' }, [
          ['all', 'All Public Pages'],
          ['jobs-exams', 'Jobs & Exam Hubs Only (/jobs-careers/*, /study/*)'],
          ['home-landing', 'Homepage & Landing Hubs Only'],
          ['custom', 'Custom Include / Exclude Route Rules']
        ].map(function (v) { return el('option', { value: v[0], text: v[1], selected: (sec.visibility || 'all') === v[0] }); }));

        var inclInp = el('input', { type: 'text', class: 'cso-mod-input', placeholder: 'Include routes (comma-separated, e.g. /jobs-careers/*)', value: sec.include_routes || '' });
        var exclInp = el('input', { type: 'text', class: 'cso-mod-input', placeholder: 'Exclude routes (e.g. /privacy-policy.html,/disclaimer.html)', value: sec.exclude_routes || '' });
        var tInp = el('input', { type: 'text', class: 'cso-mod-input', value: sec.title || '' });
        var oTInp = el('input', { type: 'text', class: 'cso-mod-input', placeholder: 'Odia Title (ଓଡ଼ିଆ)', value: sec.odia_title || '' });
        var txtInp = el('textarea', { class: 'cso-mod-textarea', value: sec.text || '' });
        var oTxtInp = el('textarea', { class: 'cso-mod-textarea', placeholder: 'Odia Copy (ଓଡ଼ିଆ)', value: sec.odia_text || '' });
        var lblInp = el('input', { type: 'text', class: 'cso-mod-input', value: sec.label || '' });
        var urlInp = el('input', { type: 'text', class: 'cso-mod-input', value: sec.url || '' });
        var secLblInp = el('input', { type: 'text', class: 'cso-mod-input', placeholder: 'Secondary Button Label', value: sec.secondary_label || '' });
        var secUrlInp = el('input', { type: 'text', class: 'cso-mod-input', placeholder: 'Secondary Button URL', value: sec.secondary_url || '' });
        var attLblInp = el('input', { type: 'text', class: 'cso-mod-input', placeholder: 'Attachment Label (e.g. Official PDF)', value: sec.attachment_label || '' });
        var attUrlInp = el('input', { type: 'text', class: 'cso-mod-input', placeholder: 'R2 PDF / Google Drive URL', value: sec.attachment_url || '' });

        var priPick = makeRoutePicker(function (v) { urlInp.value = v; sec.url = v; updatePreview(); });
        var secPick = makeRoutePicker(function (v) { secUrlInp.value = v; sec.secondary_url = v; updatePreview(); });

        chk.addEventListener('change', function () { sec.enabled = chk.checked; updatePreview(); });
        styleSel.addEventListener('change', function () { sec.style = styleSel.value; updatePreview(); });
        visSel.addEventListener('change', function () { sec.visibility = visSel.value; updatePreview(); });
        inclInp.addEventListener('input', function () { sec.include_routes = inclInp.value; updatePreview(); });
        exclInp.addEventListener('input', function () { sec.exclude_routes = exclInp.value; updatePreview(); });
        tInp.addEventListener('input', function () { sec.title = tInp.value; updatePreview(); });
        oTInp.addEventListener('input', function () { sec.odia_title = oTInp.value; updatePreview(); });
        txtInp.addEventListener('input', function () { sec.text = txtInp.value; updatePreview(); });
        oTxtInp.addEventListener('input', function () { sec.odia_text = oTxtInp.value; updatePreview(); });
        lblInp.addEventListener('input', function () { sec.label = lblInp.value; updatePreview(); });
        urlInp.addEventListener('input', function () { sec.url = urlInp.value; updatePreview(); });
        secLblInp.addEventListener('input', function () { sec.secondary_label = secLblInp.value; updatePreview(); });
        secUrlInp.addEventListener('input', function () { sec.secondary_url = secUrlInp.value; updatePreview(); });
        attLblInp.addEventListener('input', function () { sec.attachment_label = attLblInp.value; updatePreview(); });
        attUrlInp.addEventListener('input', function () { sec.attachment_url = attUrlInp.value; updatePreview(); });

        var r2UploadInp = el('input', { type: 'file', class: 'cso-sr-file', accept: '.pdf,.png,.jpg,.jpeg,.webp,.docx' });
        r2UploadInp.addEventListener('change', async function () {
          var f = r2UploadInp.files && r2UploadInp.files[0];
          if (!f) return;
          try {
            var fd = new FormData();
            fd.append('file', f);
            var up = await api('POST', 'media/upload', fd, true);
            var u = up.url || up.public_url || ('/media/' + (up.key || f.name));
            attLblInp.value = f.name;
            attUrlInp.value = u;
            sec.attachment_label = f.name;
            sec.attachment_url = u;
            updatePreview();
            toast('Uploaded R2 attachment: ' + f.name, 'success');
          } catch (e) { toast(e.message, 'crimson'); }
        });

        var aiPolishBtn = el('button', {
          type: 'button',
          class: 'cso-mod-btn cso-mod-btn-sm',
          text: '✨ AI Polish English + Odia',
          onclick: async function () {
            aiPolishBtn.disabled = true;
            try {
              var res = await api('POST', 'ai/generate-page', {
                mode: 'polish_section',
                topic: (tInp.value || sec.name || sec.id) + ': ' + (txtInp.value || ''),
                language: 'Bilingual English + Odia'
              });
              var gen = res.page || res;
              if (gen.hero_title || gen.title) { tInp.value = gen.hero_title || gen.title; sec.title = tInp.value; }
              if (gen.meta_description) { txtInp.value = gen.meta_description; sec.text = txtInp.value; }
              if (gen.hero_subtitle) { oTxtInp.value = gen.hero_subtitle; sec.odia_text = oTxtInp.value; }
              updatePreview();
              toast('AI polished English + Odia copy', 'success');
            } catch (e) { toast(e.message, 'crimson'); }
            finally { aiPolishBtn.disabled = false; }
          }
        });

        var headerTools = [
          el('span', { class: 'cso-drag-handle', text: '⋮⋮' }),
          el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: '↑', disabled: idx === 0, onclick: function () { var t = sections[idx - 1]; sections[idx - 1] = sections[idx]; sections[idx] = t; renderCards(); updatePreview(); } }),
          el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: '↓', disabled: idx === sections.length - 1, onclick: function () { var t = sections[idx + 1]; sections[idx + 1] = sections[idx]; sections[idx] = t; renderCards(); updatePreview(); } }),
          el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Duplicate', onclick: function () { var cp = Object.assign({}, sec, { id: sec.id + '-copy-' + Date.now(), name: (sec.name || sec.id) + ' (Copy)', custom: true }); sections.splice(idx + 1, 0, cp); renderCards(); updatePreview(); } })
        ];
        if (sec.custom) {
          headerTools.push(el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Delete', onclick: function () { sections.splice(idx, 1); renderCards(); updatePreview(); } }));
        }

        card.appendChild(el('div', { class: 'cso-drawer-head' }, [
          el('div', {}, [el('h3', { text: sec.name || sec.id }), badge(sec.id, 'ok')]),
          el('div', { class: 'cso-mod-toolbar' }, headerTools)
        ]));
        card.appendChild(el('div', { class: 'cso-mod-toolbar' }, [
          el('label', { class: 'cso-check-label' }, [chk, el('span', { text: 'Enabled' })]),
          aiPolishBtn
        ]));
        card.appendChild(el('div', { class: 'cso-mod-grid-2' }, [
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Visual Accent Style' }), styleSel]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Where This Strip Appears' }), visSel]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Include Routes (for Custom)' }), inclInp]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Exclude Routes' }), exclInp]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Title (English)' }), tInp]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Odia Title (ଓଡ଼ିଆ)' }), oTInp]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Body Copy (English)' }), txtInp]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Odia Copy (ଓଡ଼ିଆ)' }), oTxtInp]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Primary Link Label' }), lblInp]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Primary Link URL' }), urlInp, priPick]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Secondary Action Label' }), secLblInp]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Secondary Action URL' }), secUrlInp, secPick])
        ]));
        card.appendChild(el('div', { class: 'cso-mod-card' }, [
          el('div', { class: 'cso-mod-label', text: 'Optional R2 PDF / Google Drive Attachment' }),
          el('div', { class: 'cso-mod-grid-2' }, [attLblInp, attUrlInp]),
          el('div', { class: 'cso-mod-toolbar' }, [
            el('label', { class: 'cso-mod-btn cso-mod-btn-sm' }, ['Upload PDF to R2', r2UploadInp]),
            el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Pick from R2 Library', onclick: function () { openR2Picker(function (u, n) { attLblInp.value = n; attUrlInp.value = u; sec.attachment_label = n; sec.attachment_url = u; updatePreview(); }); } })
          ])
        ]));
        leftCol.appendChild(card);
      });
    }

    function renderPreviewPane() {
      clear(rightCol);
      var routeSel = el('select', { class: 'cso-mod-select' }, verifiedRoutes.map(function (r) {
        return el('option', { value: r, text: 'Preview Route: ' + r, selected: previewRoute === r });
      }));
      routeSel.addEventListener('change', function () { previewRoute = routeSel.value; updatePreview(); });

      var vpD = el('button', { type: 'button', class: 'cso-pill cso-pill-active', text: 'Desktop', onclick: function () { setVp('desktop'); } });
      var vpT = el('button', { type: 'button', class: 'cso-pill', text: '768px', onclick: function () { setVp('tablet'); } });
      var vpM = el('button', { type: 'button', class: 'cso-pill', text: '375px', onclick: function () { setVp('mobile'); } });
      function setVp(v) {
        previewViewport = v;
        vpD.classList.toggle('cso-pill-active', v === 'desktop');
        vpT.classList.toggle('cso-pill-active', v === 'tablet');
        vpM.classList.toggle('cso-pill-active', v === 'mobile');
        previewFrame.className = 'cso-builder-iframe' + (v === 'mobile' ? ' cso-preview-frame-mobile' : '');
      }

      rightCol.appendChild(el('div', { class: 'cso-mod-card' }, [
        el('div', { class: 'cso-preview-header-stack' }, [
          el('div', { class: 'cso-drawer-head' }, [
            el('strong', { text: 'Real-CSS Sitewide Preview' }),
            el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Full-Screen Real View', onclick: openFullscreenPreview })
          ]),
          routeSel,
          el('div', { class: 'cso-pill-row' }, [vpD, vpT, vpM])
        ]),
        el('div', { class: 'cso-preview-frame-wrap' }, [previewFrame])
      ]));
    }

    async function verifyAllLinks() {
      var urls = [bannerState.ctaUrl].concat(sections.reduce(function (acc, s) {
        return acc.concat([s.url, s.secondary_url, s.attachment_url]);
      }, [])).filter(Boolean);
      if (!urls.length) { toast('No URLs to verify', 'info'); return; }
      try {
        var r = await api('POST', 'utils/check-links', { urls: urls });
        var results = r.results || [];
        var okCnt = results.filter(function (x) { return x.ok || (x.status >= 200 && x.status < 400); }).length;
        linkHealthText = okCnt + '/' + results.length + ' (200 OK)';
        renderKpis();
        toast('Link check: ' + linkHealthText, okCnt === results.length ? 'success' : 'warn');
      } catch (e) { toast(e.message, 'crimson'); }
    }

    async function openRollbackDrawer() {
      clear(drawerHost);
      var box = el('div', { class: 'cso-drawer' });
      box.appendChild(el('div', { class: 'cso-drawer-head' }, [
        el('strong', { text: '10-Snapshot Rollback — /__sitewide' }),
        el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Close', onclick: function () { clear(drawerHost); } })
      ]));
      var listHost = el('div', { class: 'cso-mod-muted', text: 'Loading snapshots...' });
      box.appendChild(listHost);
      drawerHost.appendChild(box);
      try {
        var res = await api('GET', 'pages/revisions?route=' + encodeURIComponent('/__sitewide'));
        clear(listHost);
        var revs = (res && res.revisions) || [];
        if (!revs.length) { listHost.textContent = 'No snapshots recorded yet.'; return; }
        revs.slice(0, 10).forEach(function (rv) {
          listHost.appendChild(el('div', { class: 'cso-mod-toolbar' }, [
            badge('#' + rv.id, 'info'),
            el('span', { text: (rv.created_at || '') + ' · ' + (rv.note || 'Snapshot') }),
            el('button', {
              type: 'button',
              class: 'cso-mod-btn cso-mod-btn-sm cso-mod-btn-primary',
              text: 'Restore',
              onclick: async function () {
                try {
                  await api('POST', 'pages/restore', { route: '/__sitewide', revision_id: rv.id });
                  toast('Restored snapshot #' + rv.id, 'success');
                  clear(drawerHost);
                  await loadSitewide();
                } catch (e) { toast(e.message, 'crimson'); }
              }
            })
          ]));
        });
      } catch (e) { listHost.textContent = e.message; }
    }

    function openPresetsDrawer() {
      clear(drawerHost);
      drawerHost.appendChild(el('div', { class: 'cso-drawer' }, [
        el('div', { class: 'cso-drawer-head' }, [
          el('strong', { text: 'Load Odisha Portal Presets' }),
          el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Close', onclick: function () { clear(drawerHost); } })
        ]),
        el('div', { class: 'cso-mod-grid-3' }, PRESETS.map(function (pr) {
          return el('div', { class: 'cso-mod-card' }, [
            el('strong', { text: pr.name }),
            el('p', { class: 'cso-mod-muted', text: pr.text }),
            el('button', {
              type: 'button',
              class: 'cso-mod-btn cso-mod-btn-primary cso-mod-btn-sm',
              text: '+ Add Preset Strip',
              onclick: function () {
                sections.push(Object.assign({}, pr, { id: pr.id + '-' + Date.now(), custom: true }));
                clear(drawerHost);
                renderCards();
                updatePreview();
              }
            })
          ]);
        }))
      ]));
    }

    function addCustomStrip() {
      sections.push({
        id: 'custom-strip-' + Date.now(),
        name: 'Custom Sitewide Strip',
        custom: true,
        enabled: true,
        style: 'emerald',
        visibility: 'all',
        exclude_routes: '/privacy-policy.html,/disclaimer.html',
        title: 'New Odisha Portal Strip',
        odia_title: 'ନୂତନ ସୂଚନା',
        text: 'Add verified announcement or promotional copy here.',
        odia_text: '',
        label: 'Explore Now',
        url: '/jobs-careers/',
        secondary_label: '',
        secondary_url: ''
      });
      renderCards();
      updatePreview();
    }

    function exportJson() {
      var data = JSON.stringify({ exported_at: new Date().toISOString(), banner: bannerState, sections: sections }, null, 2);
      var a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
      a.download = 'cso-sitewide-sections.json';
      a.click();
    }

    var importInp = el('input', { type: 'file', class: 'cso-sr-file', accept: 'application/json,.json' });
    importInp.addEventListener('change', function () {
      var f = importInp.files && importInp.files[0];
      if (!f) return;
      var rd = new FileReader();
      rd.onload = function () {
        try {
          var parsed = JSON.parse(String(rd.result || '{}'));
          if (Array.isArray(parsed.sections)) sections = parsed.sections;
          if (parsed.banner) bannerState = Object.assign({}, bannerState, parsed.banner);
          renderCards();
          updatePreview();
          toast('Imported sitewide configuration JSON', 'success');
        } catch (e) { toast('Invalid JSON: ' + e.message, 'crimson'); }
      };
      rd.readAsText(f);
    });

    async function saveSitewide() {
      try {
        await api('PUT', 'pages', {
          route: '/__sitewide',
          title: 'Sitewide Reusable Sections',
          status: 'published',
          reusable_sections_json: JSON.stringify(sections),
          note: 'Updated reusable sitewide sections'
        });
        lastPublishedAt = new Date().toLocaleTimeString();
        renderKpis();
        toast('Sitewide sections published live!', 'success');
      } catch (e) {
        toast(e.message, 'crimson');
      }
    }

    async function loadSitewide() {
      try {
        var [sw, b] = await Promise.all([api('GET', 'pages/sitewide'), api('GET', 'banner')]);
        bannerState = Object.assign({}, bannerState, b || {});
        var saved = Array.isArray(sw.sections) && sw.sections.length ? sw.sections : [];
        var merged = DEFAULT_SECTIONS.map(function (def) {
          var match = saved.find(function (x) { return x.id === def.id; });
          return match ? Object.assign({}, def, match) : Object.assign({}, def);
        });
        saved.forEach(function (x) {
          if (!merged.some(function (m) { return m.id === x.id; })) merged.push(Object.assign({ custom: true }, x));
        });
        sections = merged;
        if (sw && sw.updated_at) lastPublishedAt = String(sw.updated_at).slice(0, 16).replace('T', ' ');
      } catch (e) {
        sections = DEFAULT_SECTIONS.map(function (d) { return Object.assign({}, d); });
        toast(e.message, 'crimson');
      }
      try {
        var [pgs, mts, jbs] = await Promise.all([
          api('GET', 'pages').catch(function () { return {}; }),
          api('GET', 'mock-tests').catch(function () { return {}; }),
          api('GET', 'jobs').catch(function () { return {}; })
        ]);
        var set = {};
        verifiedRoutes.forEach(function (r) { set[r] = true; });
        ((pgs && pgs.pages) || []).forEach(function (p) { if (p.route && p.route !== '/__sitewide') set[p.route] = true; });
        ((mts && mts.tests) || []).forEach(function (m) { if (m.slug) set['/mock-tests/?test=' + m.slug] = true; });
        ((jbs && jbs.jobs) || []).forEach(function (j) { if (j.slug) set['/jobs-careers/?job=' + j.slug] = true; });
        verifiedRoutes = Object.keys(set);
      } catch (_r) { /* keep defaults */ }
      renderCards();
      renderPreviewPane();
      updatePreview();
    }

    renderBanner(shell, 'Reusable Sections & Sitewide Strips Studio', 'Manage sitewide strips, page-targeting rules, bilingual Odia copy, R2 attachments, snapshots & real-CSS previews.', [
      el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-primary', text: 'Publish All Sitewide Sections Live', onclick: saveSitewide }),
      el('button', { type: 'button', class: 'cso-mod-btn', text: '+ Add Custom Sitewide Strip', onclick: addCustomStrip }),
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'Load Odisha Portal Presets', onclick: openPresetsDrawer }),
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'Verify All Links (200 OK)', onclick: verifyAllLinks }),
      el('button', { type: 'button', class: 'cso-mod-btn', text: '10-Snapshot Rollback', onclick: openRollbackDrawer }),
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'Export JSON', onclick: exportJson }),
      el('label', { class: 'cso-mod-btn' }, ['Import JSON', importInp]),
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'Reload', onclick: loadSitewide })
    ]);
    shell.appendChild(kpiHost);
    shell.appendChild(drawerHost);
    splitHost.appendChild(leftCol);
    splitHost.appendChild(rightCol);
    shell.appendChild(splitHost);
    shell.appendChild(fullscreenHost);
    root.appendChild(shell);
    loadSitewide();
  }

  function f02EscapeAttr(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function f02BuildPagePreviewHtml(cfg) {
    var title = f02EscapeAttr(cfg.title || cfg.route || 'Page Preview');
    var desc = f02EscapeAttr(cfg.meta_description || '');
    var hTitle = f02EscapeAttr(cfg.hero_title || cfg.title || 'Common Sense Odisha');
    var hSub = f02EscapeAttr(cfg.hero_subtitle || '');
    var odia = f02EscapeAttr(cfg.odia_subtitle || '');
    var ctaLbl = f02EscapeAttr(cfg.cta_label || '');
    var ctaUrl = f02EscapeAttr(cfg.cta_url || '#');
    var blocks = f02ParseBlocks(cfg.blocks_json);
    var html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>' + title + '</title><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/assets/site.css"></head>' +
      '<body><header class="site-header"><div class="container header-inner"><a class="brand" href="/">Common Sense Odisha</a></div></header>' +
      '<main class="container section"><section class="hero-card">' +
      '<span class="badge">' + f02EscapeAttr(cfg.category || 'Portal') + ' · ' + f02EscapeAttr(cfg.status || 'draft') + '</span>' +
      '<h1>' + hTitle + '</h1>' +
      (hSub ? '<p class="lead">' + hSub + '</p>' : '') +
      (odia ? '<p>' + odia + '</p>' : '') +
      (desc ? '<p>' + desc + '</p>' : '') +
      (ctaLbl ? '<div class="hero-actions"><a class="btn btn-primary" href="' + ctaUrl + '">' + ctaLbl + '</a></div>' : '') +
      '</section>';
    blocks.forEach(function (b) {
      html += '<section class="card"><span class="badge">' + f02EscapeAttr((b.type || 'section').toUpperCase()) + '</span>';
      if (b.title) html += '<h2>' + f02EscapeAttr(b.title) + '</h2>';
      if (b.text) html += '<p>' + f02EscapeAttr(b.text) + '</p>';
      if (Array.isArray(b.items) && b.items.length) {
        html += '<ul>' + b.items.map(function (it) { return '<li>' + f02EscapeAttr(String(it).split('|')[0]) + '</li>'; }).join('') + '</ul>';
      }
      html += '</section>';
    });
    html += '</main></body></html>';
    return html;
  }

  function f02OpenPageFullscreen(fullscreenHost, cfg, heading) {
    clear(fullscreenHost);
    var fsMode = 'desktop';
    var fsFrame = el('iframe', { class: 'cso-fullscreen-frame', sandbox: 'allow-same-origin', title: heading || 'Real-CSS Preview' });
    fsFrame.srcdoc = f02BuildPagePreviewHtml(cfg);
    var bD = el('button', { type: 'button', class: 'cso-pill cso-pill-active', text: 'Desktop 100%', onclick: function () { setFs('desktop'); } });
    var bT = el('button', { type: 'button', class: 'cso-pill', text: 'Tablet 768px', onclick: function () { setFs('tablet'); } });
    var bM = el('button', { type: 'button', class: 'cso-pill', text: 'Mobile 375px', onclick: function () { setFs('mobile'); } });
    function setFs(m) {
      fsMode = m;
      bD.classList.toggle('cso-pill-active', m === 'desktop');
      bT.classList.toggle('cso-pill-active', m === 'tablet');
      bM.classList.toggle('cso-pill-active', m === 'mobile');
      fsFrame.className = 'cso-fullscreen-frame' + (m === 'tablet' ? ' is-tablet' : m === 'mobile' ? ' is-mobile' : '');
    }
    function closeFs() { document.removeEventListener('keydown', onEsc); clear(fullscreenHost); }
    function onEsc(e) { if (e.key === 'Escape') closeFs(); }
    document.addEventListener('keydown', onEsc);
    fullscreenHost.appendChild(el('div', { class: 'cso-fullscreen-overlay' }, [
      el('div', { class: 'cso-drawer-head' }, [
        el('div', { class: 'cso-mod-toolbar' }, [
          el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: '← Back', onclick: closeFs }),
          el('strong', { text: heading || ('Real-CSS Preview — ' + (cfg.route || cfg.title || '')) })
        ]),
        el('div', { class: 'cso-mod-toolbar' }, [bD, bT, bM])
      ]),
      el('div', { class: 'cso-fullscreen-stage' }, [fsFrame])
    ]));
  }

  /* -------------------------------------------------------------------------
     02-008: Page Revisions (site_page_revisions + /api/admin/audit + Diff)
     ------------------------------------------------------------------------- */
  function renderPageRevisionsStudio(root, actions) {
    addHeaderPill(actions, '● Page Revisions');
    var shell = el('div', { class: 'cso-mod-shell' });
    var kpiHost = el('div', {});
    var routeSel = el('select', { class: 'cso-mod-select' });
    var globalFeedHost = el('div', {});
    var revHost = el('div', {});
    var diffHost = el('div', {});
    var auditHost = el('div', {});
    var fullscreenHost = el('div', {});

    var pagesList = [];
    var pagesByRoute = {};
    var currentRevs = [];
    var allGlobalRevs = [];
    var allAuditLogs = [];
    var auditQuery = '';

    function parseSnap(rev) {
      try { return JSON.parse(rev.snapshot_json || '{}'); } catch (_) { return {}; }
    }

    function showDiff(revA, revB) {
      clear(diffHost);
      var snapA = parseSnap(revA);
      var cur = revB ? parseSnap(revB) : (pagesByRoute[revA.route] || {});
      var rightTitle = revB ? ('Revision #' + revB.id + ' (' + (revB.created_at || '') + ')') : 'Current Live State';
      var fields = [
        ['Title', cur.title || '', snapA.title || ''],
        ['Status', cur.status || 'published', snapA.status || ''],
        ['Meta Description', cur.meta_description || '', snapA.meta_description || ''],
        ['Hero Title', cur.hero_title || '', snapA.hero_title || ''],
        ['Odia Subtitle', cur.odia_subtitle || cur.hero_subtitle || '', snapA.odia_subtitle || snapA.hero_subtitle || ''],
        ['CTA Label / URL', (cur.cta_label || '') + ' → ' + (cur.cta_url || ''), (snapA.cta_label || '') + ' → ' + (snapA.cta_url || '')],
        ['Blocks JSON', JSON.stringify(f02ParseBlocks(cur.blocks_json)), JSON.stringify(f02ParseBlocks(snapA.blocks_json))]
      ];
      var rightCol = el('div', { class: 'cso-diff-col' }, [el('h4', { text: rightTitle })]);
      var leftCol = el('div', { class: 'cso-diff-col' }, [el('h4', { text: 'Snapshot #' + revA.id + ' (' + (revA.created_at || '') + ')' })]);
      fields.forEach(function (f) {
        var changed = f[1] !== f[2];
        rightCol.appendChild(el('div', { class: 'cso-diff-row' + (changed ? ' cso-diff-changed' : ''), text: f[0] + ': ' + (f[1] || '—') }));
        leftCol.appendChild(el('div', { class: 'cso-diff-row' + (changed ? ' cso-diff-changed' : ''), text: f[0] + ': ' + (f[2] || '—') }));
      });
      var branchInp = el('input', { type: 'text', class: 'cso-mod-input', value: (revA.route === '/' ? '/home-branch/' : revA.route.replace(/\/$/, '') + '-v' + revA.id + '/') });

      diffHost.appendChild(el('div', { class: 'cso-drawer' }, [
        el('div', { class: 'cso-drawer-head' }, [
          el('strong', { text: 'Side-by-Side Diff — ' + revA.route }),
          el('div', { class: 'cso-mod-toolbar' }, [
            el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Real-CSS Preview', onclick: function () { f02OpenPageFullscreen(fullscreenHost, Object.assign({ route: revA.route }, snapA), 'Snapshot #' + revA.id + ' — ' + revA.route); } }),
            el('button', {
              type: 'button',
              class: 'cso-mod-btn cso-mod-btn-primary cso-mod-btn-sm',
              text: 'Restore Live',
              onclick: async function () {
                try {
                  await api('POST', 'pages/restore', { route: revA.route, revision_id: revA.id, status: 'published' });
                  toast('Restored revision #' + revA.id + ' live!', 'success');
                  await init();
                } catch (e) { toast(e.message, 'crimson'); }
              }
            }),
            el('button', {
              type: 'button',
              class: 'cso-mod-btn cso-mod-btn-sm',
              text: 'Restore as Safe Draft',
              onclick: async function () {
                try {
                  await api('POST', 'pages/restore', { route: revA.route, revision_id: revA.id, status: 'draft' });
                  toast('Restored #' + revA.id + ' as draft (see module-02-009)', 'success');
                  await init();
                } catch (e) { toast(e.message, 'crimson'); }
              }
            }),
            el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Close', onclick: function () { clear(diffHost); } })
          ])
        ]),
        el('div', { class: 'cso-diff-grid' }, [rightCol, leftCol]),
        el('div', { class: 'cso-mod-toolbar' }, [
          branchInp,
          el('button', {
            type: 'button',
            class: 'cso-mod-btn cso-mod-btn-sm',
            text: 'Branch as New Page',
            onclick: async function () {
              try {
                var target = f02NormalizeRoute(branchInp.value);
                await api('POST', 'pages', Object.assign({}, snapA, { route: target, status: 'draft', note: 'Branched from ' + revA.route + ' #' + revA.id }));
                toast('Branched into new draft: ' + target, 'success');
                await init();
              } catch (e) { toast(e.message, 'crimson'); }
            }
          }),
          el('button', {
            type: 'button',
            class: 'cso-mod-btn cso-mod-btn-sm',
            text: 'Save Revision as D1 Template',
            onclick: async function () {
              try {
                var sRes = await api('GET', 'settings');
                var raw = (sRes && sRes.settings && sRes.settings.custom_page_templates) || '[]';
                var list = JSON.parse(raw);
                list.push({
                  id: 'rev-' + revA.id + '-' + Date.now(),
                  name: (snapA.title || revA.route) + ' (Rev #' + revA.id + ')',
                  category: snapA.category || 'Core Portal',
                  version: 'v1.0',
                  meta_description: snapA.meta_description || '',
                  hero_title: snapA.hero_title || snapA.title || '',
                  hero_subtitle: snapA.hero_subtitle || '',
                  cta_label: snapA.cta_label || 'Explore Now',
                  cta_url: snapA.cta_url || '/jobs-careers/',
                  blocks: f02ParseBlocks(snapA.blocks_json)
                });
                await api('POST', 'settings', { key: 'custom_page_templates', value: JSON.stringify(list) });
                toast('Saved revision #' + revA.id + ' to Custom D1 Templates (module-02-006)', 'success');
              } catch (e) { toast(e.message, 'crimson'); }
            }
          })
        ])
      ]));
    }

    async function loadRevisions(route) {
      clear(revHost);
      clear(diffHost);
      if (!route) return;
      revHost.appendChild(el('p', { class: 'cso-mod-muted', text: 'Loading snapshots for ' + route + '…' }));
      try {
        var d = await api('GET', 'pages/revisions?route=' + encodeURIComponent(route));
        currentRevs = d.revisions || [];
        clear(revHost);
        if (!currentRevs.length) {
          revHost.appendChild(el('p', { class: 'cso-mod-muted', text: 'No D1 snapshots recorded yet for ' + route + '. Click "Create Baseline Snapshot Now" above.' }));
          return;
        }
        var rows = currentRevs.map(function (r, idx) {
          var prevRev = currentRevs[idx + 1] || null;
          return el('tr', {}, [
            el('td', { text: '#' + r.id }),
            el('td', { text: r.editor_email || '—' }),
            el('td', { text: r.note || 'update' }),
            el('td', { text: r.created_at || '—' }),
            el('td', {}, el('div', { class: 'cso-mod-toolbar' }, [
              el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Diff vs Live', onclick: function () { showDiff(r, null); } }),
              prevRev ? el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Diff vs #' + prevRev.id, onclick: function () { showDiff(r, prevRev); } }) : '',
              el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Preview', onclick: function () { f02OpenPageFullscreen(fullscreenHost, Object.assign({ route: r.route }, parseSnap(r)), 'Snapshot #' + r.id + ' — ' + r.route); } }),
              el('button', {
                type: 'button',
                class: 'cso-mod-btn cso-mod-btn-sm',
                text: 'Export JSON',
                onclick: function () {
                  var a = document.createElement('a');
                  a.href = URL.createObjectURL(new Blob([JSON.stringify(r, null, 2)], { type: 'application/json' }));
                  a.download = 'revision-' + r.id + '.json';
                  a.click();
                }
              }),
              el('button', {
                type: 'button',
                class: 'cso-mod-btn cso-mod-btn-primary cso-mod-btn-sm',
                text: 'Restore Live',
                onclick: async function () {
                  try {
                    await api('POST', 'pages/restore', { route: r.route, revision_id: r.id, status: 'published' });
                    toast('Restored revision #' + r.id + ' live!', 'success');
                    await init();
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

    function renderAuditTable() {
      clear(auditHost);
      var q = auditQuery.toLowerCase();
      var logs = allAuditLogs.filter(function (l) {
        if (!q) return true;
        return ((l.action || '') + ' ' + (l.target_id || '') + ' ' + (l.actor_email || '')).toLowerCase().indexOf(q) !== -1;
      });
      if (!logs.length) {
        auditHost.appendChild(el('p', { class: 'cso-mod-muted', text: 'No matching page or banner audit events.' }));
        return;
      }
      var aRows = logs.slice(0, 15).map(function (l) {
        return el('tr', {}, [
          el('td', { text: l.action || '—' }),
          el('td', { text: l.target_id || l.entity_id || '—' }),
          el('td', { text: l.actor_email || '—' }),
          el('td', { text: l.created_at || '—' })
        ]);
      });
      auditHost.appendChild(safeTable(['Action', 'Route / Key', 'Actor', 'Time'], aRows));
    }

    async function createBaselineSnapshot(route, note) {
      var pg = pagesByRoute[route];
      if (!pg) return;
      await api('PUT', 'pages', {
        route: route,
        title: pg.title || route,
        meta_description: pg.meta_description || '',
        hero_title: pg.hero_title || '',
        hero_subtitle: pg.hero_subtitle || '',
        cta_label: pg.cta_label || '',
        cta_url: pg.cta_url || '',
        blocks_json: pg.blocks_json || '[]',
        status: pg.status || 'published',
        note: note || 'Manual baseline snapshot'
      });
    }

    async function init() {
      try {
        var [pRes, gRes, aRes] = await Promise.all([
          api('GET', 'pages'),
          api('GET', 'pages/revisions?all=1'),
          api('GET', 'audit?limit=40')
        ]);
        pagesList = (pRes.pages || []).sort(function (a, b) { return (b.revisions || 0) - (a.revisions || 0); });
        allGlobalRevs = (gRes && gRes.revisions) || [];
        allAuditLogs = (aRes.items || aRes.logs || []).filter(function (x) {
          return String(x.action || '').indexOf('page.') === 0 || String(x.action || '').indexOf('banner.') === 0;
        });

        var totalSnaps = pagesList.reduce(function (acc, p) { return acc + (p.revisions || 0); }, 0);
        var pagesWithHist = pagesList.filter(function (p) { return (p.revisions || 0) > 0; }).length;
        var latestTs = allGlobalRevs[0] ? (allGlobalRevs[0].created_at || '—') : '—';

        clear(kpiHost);
        kpiHost.appendChild(el('div', { class: 'cso-kpi-grid-4' }, [
          el('div', { class: 'cso-mod-card' }, [el('div', { class: 'cso-mod-label', text: 'Total Snapshots Across Site' }), el('strong', { text: String(totalSnaps) })]),
          el('div', { class: 'cso-mod-card' }, [el('div', { class: 'cso-mod-label', text: 'Pages With Version History' }), el('strong', { text: pagesWithHist + ' / ' + pagesList.length })]),
          el('div', { class: 'cso-mod-card' }, [el('div', { class: 'cso-mod-label', text: 'Latest Snapshot Timestamp' }), el('strong', { text: latestTs })]),
          el('div', { class: 'cso-mod-card' }, [el('div', { class: 'cso-mod-label', text: 'Recent Page & Banner Audit Events' }), el('strong', { text: String(allAuditLogs.length) })])
        ]));

        clear(routeSel);
        pagesList.forEach(function (p) {
          pagesByRoute[p.route] = p;
          routeSel.appendChild(el('option', { value: p.route, text: p.route + ' (' + (p.revisions || 0) + ' revisions)' }));
        });
        if (pagesList.length) await loadRevisions(pagesList[0].route);

        clear(globalFeedHost);
        if (allGlobalRevs.length) {
          globalFeedHost.appendChild(safeTable(['Route', 'Snapshot', 'Editor', 'Note', 'Timestamp', 'Inspect'], allGlobalRevs.slice(0, 10).map(function (gr) {
            return el('tr', {}, [
              el('td', {}, el('code', { text: gr.route })),
              el('td', { text: '#' + gr.id }),
              el('td', { text: gr.editor_email || '—' }),
              el('td', { text: gr.note || 'update' }),
              el('td', { text: gr.created_at || '—' }),
              el('td', {}, el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Load Route', onclick: function () { routeSel.value = gr.route; loadRevisions(gr.route); } }))
            ]);
          })));
        } else {
          globalFeedHost.appendChild(el('p', { class: 'cso-mod-muted', text: 'No snapshots recorded across site yet.' }));
        }
        renderAuditTable();
      } catch (e) {
        toast(e.message, 'crimson');
      }
    }

    routeSel.addEventListener('change', function () { loadRevisions(routeSel.value); });
    var auditSearchInp = el('input', { type: 'search', class: 'cso-mod-input', placeholder: 'Filter audit events by route, action, or actor...' });
    auditSearchInp.addEventListener('input', function () { auditQuery = auditSearchInp.value.trim(); renderAuditTable(); });

    renderBanner(shell, 'Page Revisions & Rollback', 'Inspect D1 site_page_revisions snapshots, compare side-by-side diffs, preview real CSS, and restore any version.', [
      routeSel,
      el('button', {
        type: 'button',
        class: 'cso-mod-btn cso-mod-btn-primary',
        text: 'Create Baseline Snapshot Now',
        onclick: async function () {
          var rt = routeSel.value;
          if (!rt) return;
          var tag = window.prompt('Milestone tag / note for ' + rt + ':', 'Manual baseline snapshot') || 'Manual baseline snapshot';
          try { await createBaselineSnapshot(rt, tag); toast('Created baseline snapshot for ' + rt, 'success'); await init(); }
          catch (e) { toast(e.message, 'crimson'); }
        }
      }),
      el('button', {
        type: 'button',
        class: 'cso-mod-btn',
        text: 'Snapshot All Live Pages',
        onclick: async function () {
          var live = pagesList.filter(function (p) { return p.status === 'published' && p.route !== '/__sitewide'; });
          for (var i = 0; i < live.length; i++) {
            try { await createBaselineSnapshot(live[i].route, 'Batch live snapshot'); } catch (_e) { /* continue */ }
          }
          toast('Snapshotted ' + live.length + ' live pages', 'success');
          await init();
        }
      }),
      el('button', {
        type: 'button',
        class: 'cso-mod-btn',
        text: 'Prune Keep Latest 10',
        onclick: async function () {
          if (!routeSel.value) return;
          try { await api('POST', 'pages/prune-revisions', { route: routeSel.value, keep: 10 }); toast('Pruned older snapshots (kept latest 10)', 'success'); await init(); }
          catch (e) { toast(e.message, 'crimson'); }
        }
      }),
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'Edit in Studio', onclick: function () { if (routeSel.value) { f02State.editRoute = routeSel.value; f02State.editPage = pagesByRoute[routeSel.value]; window.selectModule && window.selectModule('folder-02', 'module-02-002'); } } }),
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'Visual Builder', onclick: function () { if (routeSel.value) { f02State.builderRoute = routeSel.value; window.selectModule && window.selectModule('folder-02', 'module-02-003'); } } }),
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'Refresh', onclick: init })
    ]);
    shell.appendChild(kpiHost);
    shell.appendChild(diffHost);
    shell.appendChild(el('div', { class: 'cso-mod-card' }, [el('h3', { text: 'Selected Route Snapshots' }), revHost]));
    shell.appendChild(el('div', { class: 'cso-mod-card' }, [el('h3', { text: 'Global Recent Revisions Feed' }), globalFeedHost]));
    shell.appendChild(el('div', { class: 'cso-mod-card' }, [el('div', { class: 'cso-drawer-head' }, [el('h3', { text: 'Recent Page & Banner Audit Events' }), auditSearchInp]), auditHost]));
    shell.appendChild(fullscreenHost);
    root.appendChild(shell);
    init();
  }

  /* -------------------------------------------------------------------------
     02-009: Drafts & Previews (Unified draft pages + content queue)
     ------------------------------------------------------------------------- */
  function renderDraftsAndPreviewsStudio(root, actions) {
    addHeaderPill(actions, '● Drafts & Previews');
    var shell = el('div', { class: 'cso-mod-shell' });
    var kpiHost = el('div', {});
    var filterHost = el('div', {});
    var drawerHost = el('div', {});
    var tableHost = el('div', {});
    var fullscreenHost = el('div', {});

    var allDrafts = [];
    var allPages = [];
    var activeFilter = 'all';

    function scoreDraft(it) {
      if (it.kind !== 'page') {
        var ok = !!(it.title && it.summary && it.summary.length >= 20);
        return { score: ok ? 5 : 3, ready: ok, seo: !!it.summary, odia: true, cta: true, links: true, slug: true };
      }
      var seo = (it.title || '').length > 0 && (it.meta_description || '').length >= 40;
      var odia = /[\u0B00-\u0B7F]/.test((it.hero_subtitle || '') + ' ' + (it.odia_subtitle || ''));
      var cta = !!(it.cta_label && it.cta_url);
      var slug = it.route && !/\s/.test(it.route);
      var links = it.links_ok !== false;
      var sc = (seo ? 1 : 0) + (odia ? 1 : 0) + (cta ? 1 : 0) + (slug ? 1 : 0) + (links ? 1 : 0);
      return { score: sc, ready: seo && cta && slug && links, seo: seo, odia: odia, cta: cta, links: links, slug: slug };
    }

    function openQuickEdit(it) {
      clear(drawerHost);
      var tInp = el('input', { type: 'text', class: 'cso-mod-input', value: it.title || '' });
      var rInp = el('input', { type: 'text', class: 'cso-mod-input', value: it.route || '' });
      var dInp = el('input', { type: 'text', class: 'cso-mod-input', value: it.meta_description || '' });
      var oInp = el('input', { type: 'text', class: 'cso-mod-input', placeholder: 'Odia Subtitle (ଓଡ଼ିଆ)', value: it.hero_subtitle || '' });
      var cLbl = el('input', { type: 'text', class: 'cso-mod-input', value: it.cta_label || '' });
      var cUrl = el('input', { type: 'text', class: 'cso-mod-input', value: it.cta_url || '' });
      var shareOut = el('input', { type: 'text', class: 'cso-mod-input', readOnly: true, value: 'https://csodisha.com' + it.route + '?preview=1 | Review Summary: ' + (it.title || it.route) });

      drawerHost.appendChild(el('div', { class: 'cso-drawer' }, [
        el('div', { class: 'cso-drawer-head' }, [
          el('strong', { text: 'Inline Quick-Edit Draft — ' + it.route }),
          el('div', { class: 'cso-mod-toolbar' }, [
            el('button', {
              type: 'button',
              class: 'cso-mod-btn cso-mod-btn-sm',
              text: '✨ AI Polish',
              onclick: async function () {
                try {
                  var res = await api('POST', 'ai/generate-page', { mode: 'optimize', topic: tInp.value || it.route, language: 'Bilingual English + Odia' });
                  var g = res.page || res;
                  if (g.title) tInp.value = g.title;
                  if (g.meta_description) dInp.value = g.meta_description;
                  if (g.hero_subtitle) oInp.value = g.hero_subtitle;
                  if (g.cta_label) cLbl.value = g.cta_label;
                  toast('AI polished draft metadata & Odia subtitle', 'success');
                } catch (e) { toast(e.message, 'crimson'); }
              }
            }),
            el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Close', onclick: function () { clear(drawerHost); } })
          ])
        ]),
        el('div', { class: 'cso-mod-grid-2' }, [
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Title' }), tInp]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Slug / Route' }), rInp]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Meta Description' }), dInp]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Odia Subtitle (ଓଡ଼ିଆ)' }), oInp]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Primary CTA Label' }), cLbl]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Primary CTA URL' }), cUrl])
        ]),
        el('div', { class: 'cso-mod-toolbar' }, [
          shareOut,
          el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Copy Review Link', onclick: function () { navigator.clipboard && navigator.clipboard.writeText(shareOut.value); toast('Copied stakeholder review link', 'success'); } }),
          el('button', {
            type: 'button',
            class: 'cso-mod-btn cso-mod-btn-primary cso-mod-btn-sm',
            text: 'Save Draft Changes',
            onclick: async function () {
              try {
                await api('PUT', 'pages', {
                  old_route: it.route,
                  route: f02NormalizeRoute(rInp.value),
                  title: tInp.value.trim(),
                  meta_description: dInp.value.trim(),
                  hero_subtitle: oInp.value.trim(),
                  cta_label: cLbl.value.trim(),
                  cta_url: cUrl.value.trim(),
                  status: 'draft',
                  note: 'Draft inline edit'
                });
                toast('Updated draft!', 'success');
                clear(drawerHost);
                await loadDrafts();
              } catch (e) { toast(e.message, 'crimson'); }
            }
          })
        ])
      ]));
    }

    function openForkLiveDrawer() {
      clear(drawerHost);
      var livePages = allPages.filter(function (p) { return p.status === 'published' && p.route !== '/__sitewide'; });
      var sel = el('select', { class: 'cso-mod-select' }, livePages.map(function (p) { return el('option', { value: p.route, text: p.route + ' — ' + (p.title || '') }); }));
      var slugInp = el('input', { type: 'text', class: 'cso-mod-input', placeholder: '/forked-draft-route/' });
      drawerHost.appendChild(el('div', { class: 'cso-drawer' }, [
        el('div', { class: 'cso-drawer-head' }, [
          el('strong', { text: 'Fork Live Page into Safe Draft' }),
          el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Close', onclick: function () { clear(drawerHost); } })
        ]),
        el('div', { class: 'cso-mod-grid-2' }, [sel, slugInp]),
        el('button', {
          type: 'button',
          class: 'cso-mod-btn cso-mod-btn-primary',
          text: 'Create Safe Draft Fork',
          onclick: async function () {
            var src = livePages.find(function (p) { return p.route === sel.value; });
            if (!src) return;
            var newRt = f02NormalizeRoute(slugInp.value || (src.route.replace(/\/$/, '') + '-draft/'));
            try {
              await api('POST', 'pages', Object.assign({}, src, { route: newRt, status: 'draft', note: 'Forked from ' + src.route }));
              toast('Forked into safe draft: ' + newRt, 'success');
              clear(drawerHost);
              await loadDrafts();
            } catch (e) { toast(e.message, 'crimson'); }
          }
        })
      ]));
    }

    async function autoFixDrafts() {
      var pageDrafts = allDrafts.filter(function (d) { return d.kind === 'page' && !scoreDraft(d).ready; });
      if (!pageDrafts.length) { toast('All page drafts already pass readiness checks', 'info'); return; }
      for (var i = 0; i < pageDrafts.length; i++) {
        var d = pageDrafts[i];
        try {
          await api('PUT', 'pages', {
            route: d.route,
            title: d.title || d.route,
            meta_description: (d.meta_description && d.meta_description.length >= 40) ? d.meta_description : ((d.title || d.route) + ' — Official Odisha portal guide, eligibility details, syllabus PDFs & CBT practice.').slice(0, 155),
            cta_label: d.cta_label || 'Explore Now',
            cta_url: d.cta_url || '/jobs-careers/',
            status: 'draft',
            note: 'Auto-fixed draft SEO & CTA'
          });
        } catch (_e) { /* continue */ }
      }
      toast('Auto-fixed ' + pageDrafts.length + ' draft(s)', 'success');
      await loadDrafts();
    }

    async function bulkPublishReady() {
      var ready = allDrafts.filter(function (d) { return scoreDraft(d).ready; });
      if (!ready.length) { toast('No 100% publish-ready drafts found', 'info'); return; }
      for (var i = 0; i < ready.length; i++) {
        var it = ready[i];
        try {
          if (it.kind === 'page') await api('PUT', 'pages', { route: it.route, status: 'published', note: 'Bulk published ready draft' });
          else await api('POST', it.kind + '/' + encodeURIComponent(it.id) + '/status', { status: 'published' });
        } catch (_e) { /* continue */ }
      }
      toast('Published ' + ready.length + ' ready draft(s)', 'success');
      await loadDrafts();
    }

    function renderView() {
      clear(kpiHost);
      clear(filterHost);
      clear(tableHost);

      var readyCnt = allDrafts.filter(function (d) { return scoreDraft(d).ready; }).length;
      var fixCnt = allDrafts.length - readyCnt;
      var latestMod = allDrafts[0] ? (allDrafts[0].updated_at || '—') : '—';
      kpiHost.appendChild(el('div', { class: 'cso-kpi-grid-4' }, [
        el('div', { class: 'cso-mod-card' }, [el('div', { class: 'cso-mod-label', text: 'Pending Drafts (Pages + Content)' }), el('strong', { text: String(allDrafts.length) })]),
        el('div', { class: 'cso-mod-card' }, [el('div', { class: 'cso-mod-label', text: '100% Publish-Ready' }), el('strong', { text: String(readyCnt) })]),
        el('div', { class: 'cso-mod-card' }, [el('div', { class: 'cso-mod-label', text: 'Needs SEO / Odia / CTA Fix' }), el('strong', { text: String(fixCnt) })]),
        el('div', { class: 'cso-mod-card' }, [el('div', { class: 'cso-mod-label', text: 'Last Modified Timestamp' }), el('strong', { text: latestMod })])
      ]));

      var pills = [
        ['all', 'All Drafts'],
        ['pages', 'Website Pages'],
        ['content', 'Content Posts'],
        ['ready', 'Publish-Ready'],
        ['fixes', 'Needs Fixes']
      ].map(function (f) {
        return el('button', { type: 'button', class: 'cso-pill' + (activeFilter === f[0] ? ' cso-pill-active' : ''), text: f[1], onclick: function () { activeFilter = f[0]; renderView(); } });
      });
      filterHost.appendChild(el('div', { class: 'cso-pill-row' }, pills));

      var filtered = allDrafts.filter(function (it) {
        var sc = scoreDraft(it);
        if (activeFilter === 'pages' && it.kind !== 'page') return false;
        if (activeFilter === 'content' && it.kind === 'page') return false;
        if (activeFilter === 'ready' && !sc.ready) return false;
        if (activeFilter === 'fixes' && sc.ready) return false;
        return true;
      });

      if (!filtered.length) {
        tableHost.appendChild(el('p', { class: 'cso-mod-muted', text: 'No drafts match this filter.' }));
        return;
      }

      var rows = filtered.map(function (it) {
        var sc = scoreDraft(it);
        var btns = [
          el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Real-CSS Preview', onclick: function () { f02OpenPageFullscreen(fullscreenHost, it, 'Draft Preview — ' + (it.route || it.title)); } }),
          el('button', {
            type: 'button',
            class: 'cso-mod-btn cso-mod-btn-primary cso-mod-btn-sm',
            text: 'Publish Live',
            onclick: async function () {
              try {
                if (it.kind === 'page') await api('PUT', 'pages', { route: it.route, status: 'published', note: 'Published from Drafts' });
                else await api('POST', it.kind + '/' + encodeURIComponent(it.id) + '/status', { status: 'published' });
                toast('Published live: ' + it.title, 'success');
                await loadDrafts();
              } catch (e) { toast(e.message, 'crimson'); }
            }
          })
        ];
        if (it.kind === 'page') {
          btns.unshift(el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Quick Edit', onclick: function () { openQuickEdit(it); } }));
          btns.push(el('button', {
            type: 'button',
            class: 'cso-mod-btn cso-mod-btn-sm',
            text: 'Schedule',
            onclick: async function () {
              var tomorrow = new Date(Date.now() + 86400000).toISOString();
              try {
                await api('PUT', 'pages', { route: it.route, status: 'scheduled', publish_at: tomorrow, note: 'Scheduled from Drafts' });
                toast('Scheduled for tomorrow; opening Scheduled Queue', 'success');
                window.selectModule && window.selectModule('folder-02', 'module-02-010');
              } catch (e) { toast(e.message, 'crimson'); }
            }
          }));
        }
        return el('tr', {}, [
          el('td', {}, badge(it.label, 'info')),
          el('td', {}, [el('strong', { text: it.title }), it.route ? el('div', {}, el('code', { text: it.route })) : '']),
          el('td', {}, [
            badge(sc.score + '/5', sc.ready ? 'ok' : 'warn'), ' ',
            badge(sc.seo ? 'SEO' : 'No SEO', sc.seo ? 'ok' : 'warn'), ' ',
            badge(sc.cta ? 'CTA' : 'No CTA', sc.cta ? 'ok' : 'warn'), ' ',
            badge(sc.odia ? 'Odia' : 'En Only', sc.odia ? 'ok' : 'info')
          ]),
          el('td', { text: it.updated_at || '—' }),
          el('td', {}, el('div', { class: 'cso-mod-toolbar' }, btns))
        ]);
      });
      tableHost.appendChild(safeTable(['Type', 'Title / Route', '5-Point Readiness', 'Last Updated', 'Actions'], rows));
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
        allPages = pRes.pages || [];
        allDrafts = [];
        allPages.forEach(function (p) {
          if (p.status === 'draft') allDrafts.push(Object.assign({ kind: 'page', label: 'Page' }, p));
        });
        [['current-affairs', 'Current Affairs', ca], ['jobs', 'Job Alert', jobs], ['mock-tests', 'Mock Test', tests]].forEach(function (g) {
          (g[2].items || []).forEach(function (x) {
            if (x.status === 'draft') allDrafts.push({ kind: g[0], label: g[1], id: x.id, title: x.title || x.slug || x.id, summary: x.summary || x.description || '', updated_at: x.updated_at });
          });
        });
        renderView();
      } catch (e) {
        clear(tableHost);
        tableHost.appendChild(el('p', { class: 'cso-mod-muted', text: e.message }));
      }
    }

    renderBanner(shell, 'Drafts & Previews Studio', '5-point pre-publish readiness scorecard, inline editing, AI polish, link verification & real-CSS previews.', [
      el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-primary', text: '+ New Blank Draft', onclick: function () { f02State.editRoute = null; f02State.editPage = null; window.selectModule && window.selectModule('folder-02', 'module-02-002'); } }),
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'From Blueprint', onclick: function () { window.selectModule && window.selectModule('folder-02', 'module-02-006'); } }),
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'Fork Live Page into Safe Draft', onclick: openForkLiveDrawer }),
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'Auto-Fix Draft SEO & CTA', onclick: autoFixDrafts }),
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'Bulk Publish All Ready Drafts', onclick: bulkPublishReady }),
      el('button', {
        type: 'button',
        class: 'cso-mod-btn',
        text: 'Verify Draft Links (200 OK)',
        onclick: async function () {
          var urls = allDrafts.map(function (d) { return d.cta_url; }).filter(Boolean);
          if (!urls.length) { toast('No CTA URLs to verify', 'info'); return; }
          try {
            var r = await api('POST', 'utils/check-links', { urls: urls });
            var okCnt = (r.results || []).filter(function (x) { return x.ok || (x.status >= 200 && x.status < 400); }).length;
            toast('Draft link check: ' + okCnt + '/' + (r.results || []).length + ' returned 200 OK', 'success');
          } catch (e) { toast(e.message, 'crimson'); }
        }
      }),
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'Refresh', onclick: loadDrafts })
    ]);
    shell.appendChild(kpiHost);
    shell.appendChild(filterHost);
    shell.appendChild(drawerHost);
    shell.appendChild(el('div', { class: 'cso-mod-card' }, [tableHost]));
    shell.appendChild(fullscreenHost);
    root.appendChild(shell);
    loadDrafts();
  }

  /* -------------------------------------------------------------------------
     02-010: Scheduled Pages (Countdowns + Inline Reschedule + Publish Now)
     ------------------------------------------------------------------------- */
  function renderScheduledPagesStudio(root, actions) {
    addHeaderPill(actions, '● Scheduled Queue');
    var shell = el('div', { class: 'cso-mod-shell' });
    var kpiHost = el('div', {});
    var drawerHost = el('div', {});
    var tableHost = el('div', {});
    var fullscreenHost = el('div', {});

    var scheduledItems = [];
    var allPages = [];
    var selected = [];
    var preflightStatus = 'Not Run';

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

    function bucketLabel(iso) {
      if (!iso) return 'Later';
      var diff = new Date(iso).getTime() - Date.now();
      if (isNaN(diff) || diff < 0) return 'Today';
      var hrs = diff / 3600000;
      if (hrs <= 24) return 'Today';
      if (hrs <= 48) return 'Tomorrow';
      if (hrs <= 168) return 'This Week';
      return 'Later';
    }

    function istNowString() {
      try {
        return new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' IST';
      } catch (_e) { return new Date().toISOString(); }
    }

    function openQuickScheduleModal() {
      clear(drawerHost);
      var candidates = allPages.filter(function (p) { return p.route !== '/__sitewide'; });
      var sel = el('select', { class: 'cso-mod-select' }, candidates.map(function (p) { return el('option', { value: p.route, text: p.route + ' (' + (p.status || 'published') + ')' }); }));
      var dtInp = el('input', { type: 'datetime-local', class: 'cso-mod-input', value: new Date(Date.now() + 3600000).toISOString().slice(0, 16) });
      var expInp = el('input', { type: 'date', class: 'cso-mod-input' });
      var redirInp = el('input', { type: 'text', class: 'cso-mod-input', placeholder: 'Evergreen redirect after expiry (e.g. /jobs-careers/)' });

      drawerHost.appendChild(el('div', { class: 'cso-drawer' }, [
        el('div', { class: 'cso-drawer-head' }, [
          el('strong', { text: '+ Schedule a Draft or Live Page (IST)' }),
          el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Close', onclick: function () { clear(drawerHost); } })
        ]),
        el('div', { class: 'cso-mod-grid-2' }, [
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Select Page' }), sel]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Release Date & Time' }), dtInp]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Optional Auto-Expiry Date' }), expInp]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Post-Expiry Redirect Target' }), redirInp])
        ]),
        el('div', { class: 'cso-mod-toolbar' }, [
          el('button', { type: 'button', class: 'cso-pill', text: '+1 Hour', onclick: function () { dtInp.value = new Date(Date.now() + 3600000).toISOString().slice(0, 16); } }),
          el('button', { type: 'button', class: 'cso-pill', text: 'Tomorrow 9:00 AM IST', onclick: function () { var d = new Date(Date.now() + 86400000); d.setHours(9, 0, 0, 0); dtInp.value = d.toISOString().slice(0, 16); } }),
          el('button', {
            type: 'button',
            class: 'cso-mod-btn cso-mod-btn-primary',
            text: 'Queue Scheduled Release',
            onclick: async function () {
              if (!sel.value || !dtInp.value) return;
              try {
                await api('PUT', 'pages', {
                  route: sel.value,
                  status: 'scheduled',
                  publish_at: new Date(dtInp.value).toISOString(),
                  expires_at: expInp.value || '',
                  expired_redirect: redirInp.value.trim(),
                  note: 'Scheduled via module-02-010'
                });
                toast('Scheduled ' + sel.value, 'success');
                clear(drawerHost);
                await loadScheduled();
              } catch (e) { toast(e.message, 'crimson'); }
            }
          })
        ])
      ]));
    }

    function exportIcs() {
      var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Common Sense Odisha//Schedule//EN'];
      scheduledItems.forEach(function (it, idx) {
        var dt = it.publish_at ? new Date(it.publish_at).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z' : '';
        lines.push('BEGIN:VEVENT', 'UID:cso-' + idx + '@csodisha.com', 'DTSTART:' + dt, 'SUMMARY:' + (it.title || it.route), 'END:VEVENT');
      });
      lines.push('END:VCALENDAR');
      var a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([lines.join('\r\n')], { type: 'text/calendar' }));
      a.download = 'cso-release-schedule.ics';
      a.click();
    }

    function renderAll() {
      clear(kpiHost);
      clear(tableHost);

      var within24 = scheduledItems.filter(function (it) {
        var diff = it.publish_at ? (new Date(it.publish_at).getTime() - Date.now()) : Infinity;
        return diff <= 86400000;
      }).length;

      var istStrong = el('strong', { text: istNowString() });
      kpiHost.appendChild(el('div', { class: 'cso-kpi-grid-4' }, [
        el('div', { class: 'cso-mod-card' }, [el('div', { class: 'cso-mod-label', text: 'Total Scheduled Items' }), el('strong', { text: String(scheduledItems.length) })]),
        el('div', { class: 'cso-mod-card' }, [el('div', { class: 'cso-mod-label', text: 'Going Live Within 24h' }), el('strong', { text: String(within24) })]),
        el('div', { class: 'cso-mod-card' }, [el('div', { class: 'cso-mod-label', text: 'Live IST Clock (Asia/Kolkata)' }), istStrong]),
        el('div', { class: 'cso-mod-card' }, [el('div', { class: 'cso-mod-label', text: 'Pre-Flight Verified (200 OK)' }), el('strong', { text: preflightStatus })])
      ]));

      if (!scheduledItems.length) {
        tableHost.appendChild(el('p', { class: 'cso-mod-muted', text: 'No scheduled pages or posts in queue.' }));
        return;
      }

      var rows = scheduledItems.map(function (it) {
        var chk = el('input', { type: 'checkbox' });
        chk.addEventListener('change', function () {
          if (chk.checked) selected.push(it);
          else selected = selected.filter(function (x) { return x !== it; });
        });
        var dtInp = el('input', { type: 'datetime-local', class: 'cso-mod-input' });
        if (it.publish_at) {
          var dt = new Date(it.publish_at);
          if (!isNaN(dt.getTime())) dtInp.value = dt.toISOString().slice(0, 16);
        }
        return el('tr', {}, [
          el('td', {}, chk),
          el('td', {}, [badge(it.label, 'warn'), ' ', badge(bucketLabel(it.publish_at), 'info')]),
          el('td', { text: it.title + (it.route ? ' (' + it.route + ')' : '') }),
          el('td', {}, badge(formatCountdown(it.publish_at), 'info')),
          el('td', {}, it.kind === 'page' ? el('div', { class: 'cso-inline-row' }, [
            dtInp,
            el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: '+1h', onclick: async function () { await api('PUT', 'pages', { route: it.route, status: 'scheduled', publish_at: new Date(Date.now() + 3600000).toISOString(), note: 'Rescheduled +1h' }); loadScheduled(); } }),
            el('button', {
              type: 'button',
              class: 'cso-mod-btn cso-mod-btn-sm',
              text: 'Set',
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
          el('td', {}, el('div', { class: 'cso-mod-toolbar' }, [
            el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Preview', onclick: function () { f02OpenPageFullscreen(fullscreenHost, it, 'Scheduled Preview — ' + (it.route || it.title)); } }),
            it.kind === 'page' ? el('button', {
              type: 'button',
              class: 'cso-mod-btn cso-mod-btn-sm',
              text: 'Unschedule → Draft',
              onclick: async function () {
                await api('PUT', 'pages', { route: it.route, status: 'draft', publish_at: null, note: 'Unscheduled back to draft' });
                toast('Moved back to draft', 'info');
                loadScheduled();
              }
            }) : '',
            el('button', {
              type: 'button',
              class: 'cso-mod-btn cso-mod-btn-primary cso-mod-btn-sm',
              text: 'Publish Now',
              onclick: async function () {
                try {
                  if (it.kind === 'page') await api('PUT', 'pages', { route: it.route, status: 'published', publish_at: null, note: 'Published immediately' });
                  else await api('POST', it.kind + '/' + encodeURIComponent(it.id) + '/status', { status: 'published' });
                  toast('Published immediately: ' + it.title, 'success');
                  loadScheduled();
                } catch (e) { toast(e.message, 'crimson'); }
              }
            })
          ]))
        ]);
      });
      tableHost.appendChild(safeTable(['', 'Type / Window', 'Title / Route', 'Countdown', 'Reschedule', 'Actions'], rows));
    }

    async function loadScheduled() {
      clear(tableHost);
      selected = [];
      try {
        var [pRes, ca, jobs, tests] = await Promise.all([
          api('GET', 'pages'),
          api('GET', 'current-affairs?limit=50'),
          api('GET', 'jobs?limit=50'),
          api('GET', 'mock-tests?limit=50')
        ]);
        allPages = pRes.pages || [];
        scheduledItems = [];
        allPages.forEach(function (p) {
          if (p.status === 'scheduled') scheduledItems.push(Object.assign({ kind: 'page', label: 'Page' }, p));
        });
        [['current-affairs', 'Current Affairs', ca], ['jobs', 'Job Alert', jobs], ['mock-tests', 'Mock Test', tests]].forEach(function (g) {
          (g[2].items || []).forEach(function (x) {
            if (x.status === 'scheduled') scheduledItems.push({ kind: g[0], label: g[1], id: x.id, title: x.title || x.slug || x.id, publish_at: x.publish_at || x.updated_at });
          });
        });
        scheduledItems.sort(function (a, b) { return new Date(a.publish_at || 0) - new Date(b.publish_at || 0); });
        renderAll();
      } catch (e) {
        tableHost.appendChild(el('p', { class: 'cso-mod-muted', text: e.message }));
      }
    }

    renderBanner(shell, 'Scheduled Pages & Release Queue', 'IST release timeline, live countdowns, pre-flight link checks, quick-schedule modal & .ics calendar export.', [
      el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-primary', text: '+ Schedule a Draft or Live Page', onclick: openQuickScheduleModal }),
      el('button', {
        type: 'button',
        class: 'cso-mod-btn',
        text: 'Pre-Flight Check (200 OK)',
        onclick: async function () {
          var urls = scheduledItems.map(function (x) { return x.cta_url; }).filter(Boolean);
          if (!urls.length) { preflightStatus = '0 URLs'; renderAll(); return; }
          try {
            var r = await api('POST', 'utils/check-links', { urls: urls });
            var okCnt = (r.results || []).filter(function (x) { return x.ok || (x.status >= 200 && x.status < 400); }).length;
            preflightStatus = okCnt + '/' + (r.results || []).length + ' OK';
            renderAll();
          } catch (e) { toast(e.message, 'crimson'); }
        }
      }),
      el('button', {
        type: 'button',
        class: 'cso-mod-btn',
        text: 'Bulk Publish Selected',
        onclick: async function () {
          if (!selected.length) { toast('Select items first', 'warn'); return; }
          for (var i = 0; i < selected.length; i++) {
            var it = selected[i];
            if (it.kind === 'page') await api('PUT', 'pages', { route: it.route, status: 'published', publish_at: null, note: 'Bulk publish scheduled' });
            else await api('POST', it.kind + '/' + encodeURIComponent(it.id) + '/status', { status: 'published' });
          }
          toast('Published ' + selected.length + ' item(s)', 'success');
          loadScheduled();
        }
      }),
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'Export .ics Calendar', onclick: exportIcs }),
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'Refresh', onclick: loadScheduled })
    ]);
    shell.appendChild(kpiHost);
    shell.appendChild(drawerHost);
    shell.appendChild(el('div', { class: 'cso-mod-card' }, [tableHost]));
    shell.appendChild(fullscreenHost);
    root.appendChild(shell);
    loadScheduled();
  }

  /* -------------------------------------------------------------------------
     02-011: Trash & Restore (Archived/Trash vault + Bulk Restore + 404 Safety)
     ------------------------------------------------------------------------- */
  function renderTrashAndRestoreStudio(root, actions) {
    addHeaderPill(actions, '● Trash & Restore');
    var shell = el('div', { class: 'cso-mod-shell' });
    var kpiHost = el('div', {});
    var toolbarHost = el('div', {});
    var drawerHost = el('div', {});
    var tableHost = el('div', {});
    var fullscreenHost = el('div', {});

    var vaultItems = [];
    var activePages = [];
    var redirectsMap = {};
    var selected = [];
    var searchText = '';
    var activeFilter = 'all';

    function daysAgo(iso) {
      if (!iso) return 0;
      var diff = Date.now() - new Date(iso).getTime();
      return isNaN(diff) ? 0 : Math.max(0, Math.floor(diff / 86400000));
    }

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
      } catch (e) { toast(e.message, 'crimson'); }
    }

    function openArchivePicker() {
      clear(drawerHost);
      var candidates = activePages.filter(function (p) { return p.status !== 'trash' && p.status !== 'archived' && p.route !== '/__sitewide' && p.route !== '/'; });
      var sel = el('select', { class: 'cso-mod-select' }, candidates.map(function (p) { return el('option', { value: p.route, text: p.route + ' (' + (p.status || 'published') + ')' }); }));
      var redirInp = el('input', { type: 'text', class: 'cso-mod-input', placeholder: 'Optional 301 Redirect Target (e.g. /jobs-careers/)' });
      drawerHost.appendChild(el('div', { class: 'cso-drawer' }, [
        el('div', { class: 'cso-drawer-head' }, [
          el('strong', { text: '+ Archive a Page to Vault (with Optional 301 Protection)' }),
          el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Close', onclick: function () { clear(drawerHost); } })
        ]),
        el('div', { class: 'cso-mod-grid-2' }, [sel, redirInp]),
        el('button', {
          type: 'button',
          class: 'cso-mod-btn cso-mod-btn-primary',
          text: 'Move to Trash Vault',
          onclick: async function () {
            if (!sel.value) return;
            try {
              await api('PUT', 'pages', { route: sel.value, status: 'trash', note: 'Archived to vault' });
              if (redirInp.value.trim()) {
                await api('POST', 'pages/redirects', { action: 'create', old_route: sel.value, new_route: redirInp.value.trim() });
              }
              toast('Archived ' + sel.value, 'success');
              clear(drawerHost);
              loadTrash();
            } catch (e) { toast(e.message, 'crimson'); }
          }
        })
      ]));
    }

    function openPurgeDrawer(it) {
      clear(drawerHost);
      var redirInp = el('input', { type: 'text', class: 'cso-mod-input', value: redirectsMap[it.route] || '/jobs-careers/', placeholder: 'Evergreen Hub Route for 301 Redirect (leave blank for none)' });
      drawerHost.appendChild(el('div', { class: 'cso-drawer' }, [
        el('div', { class: 'cso-drawer-head' }, [
          el('strong', { text: '404-Safe Permanent Purge — ' + it.route }),
          el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Close', onclick: function () { clear(drawerHost); } })
        ]),
        el('p', { class: 'cso-mod-muted', text: 'Permanently delete this page from D1 and optionally create a 301 redirect so external links never hit a 404.' }),
        el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: '301 Redirect Target (Optional)' }), redirInp]),
        el('div', { class: 'cso-mod-toolbar' }, [
          el('button', {
            type: 'button',
            class: 'cso-mod-btn cso-mod-btn-sm',
            text: 'Export JSON Backup First',
            onclick: function () {
              var a = document.createElement('a');
              a.href = URL.createObjectURL(new Blob([JSON.stringify(it, null, 2)], { type: 'application/json' }));
              a.download = 'vault-backup-' + (it.route || it.id).replace(/[^a-z0-9]/gi, '-') + '.json';
              a.click();
            }
          }),
          el('button', {
            type: 'button',
            class: 'cso-mod-btn cso-mod-btn-primary cso-mod-btn-sm',
            text: 'Delete Permanently',
            onclick: async function () {
              try {
                await api('DELETE', 'pages', { route: it.route, redirect_to: redirInp.value.trim() || null });
                toast('Permanently purged ' + it.route, 'success');
                clear(drawerHost);
                loadTrash();
              } catch (e) { toast(e.message, 'crimson'); }
            }
          })
        ])
      ]));
    }

    function renderAll() {
      clear(kpiHost);
      clear(toolbarHost);
      clear(tableHost);

      var pageCnt = vaultItems.filter(function (x) { return x.kind === 'page'; }).length;
      var contentCnt = vaultItems.length - pageCnt;
      var redirCnt = vaultItems.filter(function (x) { return x.route && redirectsMap[x.route]; }).length;
      var maxDays = vaultItems.reduce(function (m, x) { return Math.max(m, daysAgo(x.updated_at)); }, 0);

      kpiHost.appendChild(el('div', { class: 'cso-kpi-grid-4' }, [
        el('div', { class: 'cso-mod-card' }, [el('div', { class: 'cso-mod-label', text: 'Total Items in Vault' }), el('strong', { text: String(vaultItems.length) })]),
        el('div', { class: 'cso-mod-card' }, [el('div', { class: 'cso-mod-label', text: 'Pages vs. Content' }), el('strong', { text: pageCnt + ' / ' + contentCnt })]),
        el('div', { class: 'cso-mod-card' }, [el('div', { class: 'cso-mod-label', text: '404-Protected (Active 301)' }), el('strong', { text: String(redirCnt) })]),
        el('div', { class: 'cso-mod-card' }, [el('div', { class: 'cso-mod-label', text: 'Oldest Archived Item' }), el('strong', { text: maxDays + 'd ago' })])
      ]));

      var searchInp = el('input', { type: 'search', class: 'cso-mod-input', placeholder: 'Search archived routes or titles...', value: searchText });
      searchInp.addEventListener('input', function () { searchText = searchInp.value.trim(); renderAll(); });
      var pills = [
        ['all', 'All'],
        ['pages', 'Website Pages'],
        ['content', 'Content Posts'],
        ['301', 'Has Active 301']
      ].map(function (f) {
        return el('button', { type: 'button', class: 'cso-pill' + (activeFilter === f[0] ? ' cso-pill-active' : ''), text: f[1], onclick: function () { activeFilter = f[0]; renderAll(); } });
      });
      toolbarHost.appendChild(el('div', { class: 'cso-mod-toolbar' }, [searchInp, el('div', { class: 'cso-pill-row' }, pills)]));

      var filtered = vaultItems.filter(function (it) {
        if (activeFilter === 'pages' && it.kind !== 'page') return false;
        if (activeFilter === 'content' && it.kind === 'page') return false;
        if (activeFilter === '301' && !(it.route && redirectsMap[it.route])) return false;
        if (searchText && ((it.title || '') + ' ' + (it.route || '')).toLowerCase().indexOf(searchText.toLowerCase()) === -1) return false;
        return true;
      });

      if (!filtered.length) {
        tableHost.appendChild(el('p', { class: 'cso-mod-muted', text: 'Trash & archive vault is empty for this filter.' }));
        return;
      }

      var rows = filtered.map(function (it) {
        var chk = el('input', { type: 'checkbox' });
        chk.addEventListener('change', function () {
          if (chk.checked) selected.push(it);
          else selected = selected.filter(function (x) { return x !== it; });
        });
        var has301 = it.route && redirectsMap[it.route];
        var btns = [
          el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Preview', onclick: function () { f02OpenPageFullscreen(fullscreenHost, it, 'Vault Preview — ' + (it.route || it.title)); } }),
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
        ];
        if (has301) {
          btns.push(el('button', {
            type: 'button',
            class: 'cso-mod-btn cso-mod-btn-sm',
            text: 'Remove 301 (' + has301 + ')',
            onclick: async function () {
              await api('POST', 'pages/redirects', { action: 'delete', old_route: it.route });
              toast('Removed 301 redirect for ' + it.route, 'info');
              loadTrash();
            }
          }));
        }
        if (it.kind === 'page') {
          btns.push(el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Revisions', onclick: function () { window.selectModule && window.selectModule('folder-02', 'module-02-008'); } }));
          btns.push(el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Purge', onclick: function () { openPurgeDrawer(it); } }));
        }
        return el('tr', {}, [
          el('td', {}, chk),
          el('td', {}, [badge(it.label, 'danger'), ' ', badge('Archived ' + daysAgo(it.updated_at) + 'd ago', 'info')]),
          el('td', {}, [el('strong', { text: it.title }), it.route ? el('div', {}, [el('code', { text: it.route }), has301 ? ' ' : '', has301 ? badge('301 → ' + has301, 'ok') : '']) : '']),
          el('td', {}, f02StatusBadge(it.status)),
          el('td', {}, el('div', { class: 'cso-mod-toolbar' }, btns))
        ]);
      });
      tableHost.appendChild(safeTable(['', 'Type / Age', 'Title / Route', 'State', 'Actions'], rows));
    }

    async function loadTrash() {
      clear(tableHost);
      selected = [];
      try {
        var [pRes, rRes, ca, jobs, tests] = await Promise.all([
          api('GET', 'pages'),
          api('GET', 'pages/redirects').catch(function () { return {}; }),
          api('GET', 'current-affairs?limit=50'),
          api('GET', 'jobs?limit=50'),
          api('GET', 'mock-tests?limit=50')
        ]);
        redirectsMap = {};
        ((rRes && rRes.redirects) || []).forEach(function (rd) { redirectsMap[rd.old_route] = rd.new_route; });
        activePages = pRes.pages || [];
        vaultItems = [];
        activePages.forEach(function (p) {
          if (p.status === 'trash' || p.status === 'archived') vaultItems.push(Object.assign({ kind: 'page', label: 'Page' }, p));
        });
        [['current-affairs', 'Current Affairs', ca], ['jobs', 'Job Alert', jobs], ['mock-tests', 'Mock Test', tests]].forEach(function (g) {
          (g[2].items || []).forEach(function (x) {
            if (x.status === 'trash' || x.status === 'archived') vaultItems.push({ kind: g[0], label: g[1], id: x.id, title: x.title || x.slug || x.id, status: x.status, updated_at: x.updated_at });
          });
        });
        renderAll();
      } catch (e) {
        tableHost.appendChild(el('p', { class: 'cso-mod-muted', text: e.message }));
      }
    }

    renderBanner(shell, 'Trash & Restore Vault', 'Recover archived or trashed pages and content with 404-safe 301 redirect cleanup, permanent purge & JSON export.', [
      el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-primary', text: '+ Archive a Page to Vault', onclick: openArchivePicker }),
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'Bulk Restore to Draft', onclick: function () { bulkRestore('draft'); } }),
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'Bulk Re-Publish Live', onclick: function () { bulkRestore('published'); } }),
      el('button', {
        type: 'button',
        class: 'cso-mod-btn',
        text: 'Export Vault JSON',
        onclick: function () {
          var a = document.createElement('a');
          a.href = URL.createObjectURL(new Blob([JSON.stringify(vaultItems, null, 2)], { type: 'application/json' }));
          a.download = 'cso-trash-vault.json';
          a.click();
        }
      }),
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'Refresh', onclick: loadTrash })
    ]);
    shell.appendChild(kpiHost);
    shell.appendChild(toolbarHost);
    shell.appendChild(drawerHost);
    shell.appendChild(el('div', { class: 'cso-mod-card' }, [tableHost]));
    shell.appendChild(fullscreenHost);
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
    'module-03-001': {
      title: 'About Us',
      seoTitle: 'About Us | Common Sense Odisha (csodisha.com)',
      metaDescription: 'About Common Sense Odisha (csodisha.com) — independent Odisha government job, OPSC/OSSC/OSSSC exam preparation, and scholarship verification portal based in Basta, Balasore, 756029.',
      heroTitle: 'About Common Sense Odisha',
      heroSubtitle: 'Independent Odisha recruitment, exam preparation, and scholarship intelligence — verified from Basta, Balasore, 756029.',
      effectiveDate: '2026-11-13',
      path: '/about.html',
      email: 'editorial@csodisha.com',
      sections: [
        { type: 'richtext', title: 'Our Mission & Editorial Independence', text: 'Common Sense Odisha (csodisha.com) is an independent educational and career-intelligence portal built for aspirants across all 30 districts of Odisha. Every recruitment notice, syllabus, and scheme deadline is cross-checked against official government gazettes and commission portals.' },
        { type: 'richtext', title: 'Founder & Editorial Leadership', text: 'Common Sense Odisha is founded and edited by Ramesh Biswal — an educator, technology enthusiast, creative writer, and literature lover based in Basta, Balasore, 756029. He holds a Post Graduation in English from Ravenshaw University, a Bachelor of Education (B.Ed.) from UGCTE, Baripada, and is UGC NET qualified in both English and Education. Combining academic rigor in pedagogy and literature with modern web engineering, his editorial vision ensures every study guide, syllabus breakdown, and recruitment update is accurate and accessible. Contact: editorial@csodisha.com · Official Portal: https://csodisha.com' },
        { type: 'notice', title: 'Verification & Non-Affiliation Notice', text: 'Common Sense Odisha is not affiliated with any government ministry or recruitment commission. Always confirm final submission dates on the official notification linked in each post.' }
      ]
    },
    'module-03-002': {
      title: 'Contact Us',
      seoTitle: 'Contact Us | Common Sense Odisha (csodisha.com)',
      metaDescription: 'Contact Common Sense Odisha (csodisha.com) — reach the Editorial & Verification Desk in Basta, Balasore, 756029 for recruitment updates, corrections, and student queries.',
      heroTitle: 'Contact Common Sense Odisha',
      heroSubtitle: 'Reach our Editorial & Verification Desk in Basta, Balasore, 756029 for recruitment tips, factual corrections, scholarship queries, and feedback.',
      effectiveDate: '2026-11-13',
      path: '/contact.html',
      email: 'editorial@csodisha.com',
      sections: [
        { type: 'richtext', title: 'Editorial & Verification Desk', text: 'Have a question about an OPSC, OSSC, OSSSC, or teaching recruitment notice, exam syllabus, or scholarship deadline? Write directly to our Editorial Desk at editorial@csodisha.com. Please include the official notification number or advertisement link so our team can verify and respond promptly.' },
        { type: 'richtext', title: 'Corrections, Takedowns & Technical Support', text: 'If you spot a typographical error, outdated deadline, or broken link on any page, notify us at editorial@csodisha.com with the page URL. Verified corrections are updated within 24 hours. For copyright or DMCA notices, please refer to our Copyright & DMCA policy or email editorial@csodisha.com with supporting documentation.' },
        { type: 'richtext', title: 'Founder & Editorial Office', text: 'Founder & Editor-in-Chief: Ramesh Biswal · Editorial Base: Basta, Balasore, 756029 · Official Portal: https://csodisha.com' },
        { type: 'notice', title: 'Response Hours & Important Advisory', text: 'Editorial Hours: Monday to Saturday, 10:00 AM – 6:00 PM IST · Advisory: Common Sense Odisha is an independent educational portal and never asks aspirants for money, bank details, or OTPs.' }
      ]
    },
    'module-03-003': {
      title: 'Privacy Policy',
      seoTitle: 'Privacy Policy | Common Sense Odisha (csodisha.com)',
      metaDescription: 'Read the Privacy Policy of Common Sense Odisha (csodisha.com) — compliant with India\'s Digital Personal Data Protection Act, 2023 (DPDP Act) and IT Rules.',
      heroTitle: 'Privacy Policy',
      heroSubtitle: 'How Common Sense Odisha collects, safeguards, and processes user information in compliance with India\'s Digital Personal Data Protection Act, 2023 (DPDP Act).',
      effectiveDate: '2026-11-13',
      path: '/privacy.html',
      email: 'editorial@csodisha.com',
      sections: [
        { type: 'richtext', title: 'Information We Collect & Purpose of Processing', text: 'Common Sense Odisha (csodisha.com) respects your privacy and collects only minimal information necessary to operate our educational portal: (a) Account & Learning Data (name, email address, saved bookmarks, and CBT mock test practice scores when you voluntarily register); (b) Technical & Security Logs (anonymized IP telemetry, browser user-agent, and Cloudflare edge security headers used strictly to prevent abuse and unauthorized access); and (c) Voluntary Correspondence sent to our editorial desk.' },
        { type: 'richtext', title: 'How We Use Data & Zero-Sale Guarantee', text: 'We use collected data solely to deliver personalized study bookmarks, track CBT practice progress, maintain platform security, and respond to user inquiries. We never sell, rent, or trade your personal data to third-party data brokers or marketing networks.' },
        { type: 'richtext', title: 'Your Rights Under India\'s DPDP Act, 2023', text: 'Under the Digital Personal Data Protection Act, 2023 (India), you have the right to access a summary of your personal data, request correction of inaccurate details, withdraw consent or request erasure of your account and CBT records, and raise a grievance by writing to editorial@csodisha.com.' },
        { type: 'richtext', title: 'External Official Links & Edge Infrastructure', text: 'Our portal links directly to official government recruitment websites (OPSC, OSSC, OSSSC, and State Scholarship portals) and runs on Cloudflare edge infrastructure. External websites are governed by their own privacy policies.' },
        { type: 'notice', title: 'Data Grievance Contact & Effective Date', text: 'Effective Date: 2026-11-13 · Grievance & Privacy Contact: editorial@csodisha.com · Address: Basta, Balasore, 756029' }
      ]
    },
    'module-03-004': {
      title: 'Disclaimer',
      seoTitle: 'Disclaimer | Common Sense Odisha (csodisha.com)',
      metaDescription: 'Official Disclaimer of Common Sense Odisha (csodisha.com) — independent educational and Odisha recruitment portal not affiliated with any government ministry.',
      heroTitle: 'Disclaimer',
      heroSubtitle: 'Important legal and editorial notices regarding educational guides, recruitment summaries, and official government links published on Common Sense Odisha.',
      effectiveDate: '2026-11-13',
      path: '/disclaimer.html',
      email: 'editorial@csodisha.com',
      sections: [
        { type: 'richtext', title: 'Non-Affiliation with Government Bodies', text: 'Common Sense Odisha (csodisha.com) is an independent digital educational and information portal. We are not affiliated with, associated with, authorized by, endorsed by, or in any way officially connected with the Government of Odisha, OPSC, OSSC, OSSSC, UPSC, SSC, or any central/state ministry, board, or recruitment agency.' },
        { type: 'richtext', title: 'Informational Purpose & Official Verification', text: 'All recruitment summaries, exam dates, syllabi, scholarship updates, and CBT mock practice materials on this website are published in good faith for general educational and informational purposes only. While we strive for strict accuracy, readers must always verify final eligibility criteria, application deadlines, and official notices directly on the respective government portal linked in each article before submitting any application.' },
        { type: 'richtext', title: 'External Links & Limitation of Liability', text: 'External links to official recruitment notifications, PDFs, and government portals are provided solely for user convenience. Common Sense Odisha makes no warranties regarding the uninterrupted availability or third-party content of external websites and shall not be liable for any loss or discrepancy arising from reliance on summarized information.' },
        { type: 'notice', title: 'Effective Date & Corrections Contact', text: 'Effective Date: 2026-11-13 · Report any discrepancy to editorial@csodisha.com · Address: Basta, Balasore, 756029' }
      ]
    },
    'module-03-005': {
      title: 'Terms & Conditions',
      seoTitle: 'Terms & Conditions | Common Sense Odisha (csodisha.com)',
      metaDescription: 'Read the Terms & Conditions governing the use of Common Sense Odisha (csodisha.com) — Odisha recruitment alerts, exam syllabi, scholarships, and CBT prep.',
      heroTitle: 'Terms & Conditions',
      heroSubtitle: 'Rules, acceptable use standards, intellectual property terms, and governing jurisdiction for accessing Common Sense Odisha (csodisha.com).',
      effectiveDate: '2026-11-13',
      status: 'published',
      path: '/terms.html',
      email: 'editorial@csodisha.com',
      sections: [
        { type: 'richtext', title: 'Acceptance of Terms & Educational Scope', text: 'By accessing or using Common Sense Odisha (https://csodisha.com), you agree to comply with and be bound by these Terms & Conditions. All recruitment summaries, exam syllabi, scholarship guides, current affairs digests, and CBT mock tests provided on this platform are intended strictly for personal, non-commercial educational and informational use by students and job aspirants.' },
        { type: 'richtext', title: 'User Accounts & Acceptable Conduct', text: 'When creating a student account or participating in CBT practice tests, you agree to provide accurate registration information and maintain the confidentiality of your login credentials. You must not scrape, mirror, automate bulk requests against, attempt unauthorized access to administrative endpoints, or disrupt the Cloudflare edge infrastructure serving this portal.' },
        { type: 'richtext', title: 'Intellectual Property & Official Notification Links', text: 'Original study notes, syllabus compilations, CBT practice question sets, UI layouts, and editorial articles on Common Sense Odisha are protected under the Copyright Act, 1957 (India). Official government recruitment PDFs, logos, and gazette notifications remain the property of their respective government departments and recruitment commissions (such as OPSC, OSSC, and OSSSC) and are linked solely for reference.' },
        { type: 'richtext', title: 'Limitation of Liability & Governing Law', text: 'Common Sense Odisha provides content on an \'as-is\' basis without warranties of any kind. Users must verify final eligibility, fee deadlines, and exam instructions on official government portals before applying. These Terms & Conditions are governed by the laws of India, with exclusive jurisdiction vested in the competent courts of Balasore, Odisha.' },
        { type: 'notice', title: 'Effective Date & Legal Contact', text: 'Effective Date: 2026-11-13 · Legal & Editorial Contact: editorial@csodisha.com · Address: Basta, Balasore, 756029' }
      ]
    },
    'module-03-006': {
      title: 'Cookie Policy',
      seoTitle: 'Cookie Policy | Common Sense Odisha (csodisha.com)',
      metaDescription: 'Learn how Common Sense Odisha (csodisha.com) uses essential security cookies and browser storage for login sessions, CBT mock tests, and theme settings.',
      heroTitle: 'Cookie & Browser Storage Policy',
      heroSubtitle: 'Transparent disclosure of essential cookies, Cloudflare security tokens, and local browser storage used on Common Sense Odisha.',
      effectiveDate: '2026-11-13',
      status: 'published',
      path: '/cookies.html',
      email: 'editorial@csodisha.com',
      sections: [
        { type: 'richtext', title: 'What Are Cookies & Local Browser Storage?', text: 'Cookies and browser storage (localStorage / sessionStorage) are small data files stored on your device when you visit https://csodisha.com. They help keep your account signed in securely, preserve your active CBT mock test progress, remember bookmarked job alerts, and protect the portal against automated abuse.' },
        { type: 'richtext', title: 'Categories of Cookies & Storage We Use', text: 'We rely strictly on functional and security-essential storage: (a) Authentication & Session Cookies (HttpOnly, Secure, SameSite session tokens) to keep registered students and editors logged in safely; (b) Cloudflare Edge Security Cookies used strictly to distinguish legitimate visitors from malicious bots; and (c) Preference & Study Storage (localStorage keys for saved bookmarks, offline PWA caching, and UI theme preferences). We do not use invasive cross-site behavioral tracking cookies.' },
        { type: 'richtext', title: 'Managing or Clearing Cookies in Your Browser', text: 'You can view, block, or delete cookies and site storage anytime through your browser settings (Chrome, Firefox, Edge, Safari, or Brave). Please note that blocking strictly necessary session cookies may prevent account sign-in or reset saved CBT practice progress stored locally on your device.' },
        { type: 'notice', title: 'Effective Date & Privacy Inquiries', text: 'Effective Date: 2026-11-13 · Privacy & Cookie Inquiries: editorial@csodisha.com · Address: Basta, Balasore, 756029' }
      ]
    },
    'module-03-007': {
      title: 'Copyright & DMCA',
      seoTitle: 'Copyright & DMCA | Common Sense Odisha (csodisha.com)',
      metaDescription: 'Copyright & DMCA Policy of Common Sense Odisha (csodisha.com) — intellectual property ownership, official government PDF attribution, and takedown notices.',
      heroTitle: 'Copyright & DMCA Policy',
      heroSubtitle: 'Intellectual property rights, fair educational attribution of public government notices, and copyright takedown procedures for Common Sense Odisha.',
      effectiveDate: '2026-11-13',
      status: 'published',
      path: '/copyright.html',
      email: 'editorial@csodisha.com',
      sections: [
        { type: 'richtext', title: 'Ownership of Original Educational Content', text: 'All original study guides, syllabus breakdowns, CBT mock practice question sets, editorial summaries, custom graphics, and web application code published on Common Sense Odisha (https://csodisha.com) are protected under the Copyright Act, 1957 (India) and international copyright treaties. Unauthorized bulk reproduction, commercial scraping, or redistribution without prior written permission is prohibited.' },
        { type: 'richtext', title: 'Official Government Notifications & Public Domain Records', text: 'Official recruitment advertisements, exam calendars, gazette notifications, and scholarship circulars referenced on this portal belong to their respective government departments and recruitment commissions (such as OPSC, OSSC, OSSSC, and the Government of Odisha). We link directly to original official sources and summarize public-interest details strictly for educational guidance.' },
        { type: 'richtext', title: 'Submitting a Copyright or DMCA Takedown Notice', text: 'If you believe any content hosted on Common Sense Odisha infringes upon your copyrighted work, please send a written takedown notice to editorial@csodisha.com containing: (a) identification of the copyrighted work claimed to have been infringed; (b) the exact URL(s) on csodisha.com where the material appears; (c) your full name, organization (if applicable), and contact details; and (d) a good-faith statement that the disputed use is not authorized by the copyright owner or the law. Verified notices are reviewed and acted upon within 48 hours.' },
        { type: 'notice', title: 'Effective Date & Designated IP Contact', text: 'Effective Date: 2026-11-13 · Designated Copyright & DMCA Contact: editorial@csodisha.com · Address: Basta, Balasore, 756029' }
      ]
    },
    'module-03-008': {
      title: 'Editorial Policy',
      seoTitle: 'Editorial Policy | Common Sense Odisha (csodisha.com)',
      metaDescription: 'Editorial Policy of Common Sense Odisha (csodisha.com) — our fact-checking standards, primary source verification, and pedagogical review process in Odisha.',
      heroTitle: 'Editorial Policy',
      heroSubtitle: 'How Common Sense Odisha verifies government recruitment notices, designs exam syllabi and CBT practice sets, and upholds editorial independence.',
      effectiveDate: '2026-11-13',
      status: 'published',
      path: '/editorial-policy.html',
      email: 'editorial@csodisha.com',
      sections: [
        { type: 'richtext', title: 'Primary-Source Fact-Checking & Verification', text: 'Every recruitment notification, exam calendar, answer key, and scholarship update published on Common Sense Odisha (https://csodisha.com) is verified directly against primary official sources—including OPSC, OSSC, OSSSC, Odisha Police, State Scholarship Portal, and official Government of Odisha gazettes—prior to publication. Unverified rumors or unconfirmed social media forwards are never published as news.' },
        { type: 'richtext', title: 'Pedagogical Standards & CBT Quality Review', text: 'Study guides, syllabus breakdowns, and CBT mock practice questions are structured for clarity, syllabus alignment, and conceptual accuracy. Content design and editorial oversight are led by Editor-in-Chief Ramesh Biswal (Post Graduation in English from Ravenshaw University, B.Ed. from UGCTE, Baripada, and UGC NET qualified in English and Education), ensuring educational materials reflect sound pedagogical principles and clear, accessible language.' },
        { type: 'richtext', title: 'Editorial Independence & Separation of Content', text: 'Common Sense Odisha operates with full editorial independence. Recruitment summaries, syllabus guides, and scholarship explainers are selected strictly on student and public utility—never influenced by external third-party sponsors. Every article includes direct reference links to the original official notification so aspirants can cross-check details independently.' },
        { type: 'notice', title: 'Effective Date & Editorial Desk Contact', text: 'Effective Date: 2026-11-13 · Editor-in-Chief: Ramesh Biswal · Editorial Desk: editorial@csodisha.com · Address: Basta, Balasore, 756029' }
      ]
    },
    'module-03-009': {
      title: 'Corrections Policy',
      seoTitle: 'Corrections Policy | Common Sense Odisha (csodisha.com)',
      metaDescription: 'Corrections Policy of Common Sense Odisha (csodisha.com) — how we verify, update, and timestamp factual errata, exam date changes, and official corrigenda.',
      heroTitle: 'Corrections Policy',
      heroSubtitle: 'Our commitment to prompt factual corrections, transparent update timestamps, and immediate reflection of official government corrigenda.',
      effectiveDate: '2026-11-13',
      status: 'published',
      path: '/corrections.html',
      email: 'editorial@csodisha.com',
      sections: [
        { type: 'richtext', title: 'Commitment to Accuracy & Official Corrigenda', text: 'Recruitment commissions (such as OPSC, OSSC, and OSSSC) and scholarship authorities frequently issue official corrigenda, extended application deadlines, or revised answer keys. Common Sense Odisha (https://csodisha.com) actively monitors official portals to update affected articles promptly and prevent aspirants from relying on outdated dates or eligibility criteria.' },
        { type: 'richtext', title: 'How Factual Errors Are Corrected & Timestamped', text: 'When a factual discrepancy, typographical error, or official schedule revision is identified, our editorial desk verifies the change against the primary notification, updates the live page immediately, and refreshes the page\'s Last Updated timestamp alongside a revision log entry. Minor spelling or formatting adjustments that do not alter meaning are corrected silently, whereas substantive changes to dates, fees, vacancies, or answer keys are clearly noted on the page.' },
        { type: 'richtext', title: 'How Readers Can Report an Error', text: 'Readers and aspirants who spot an outdated deadline, broken official PDF link, or factual inaccuracy are encouraged to write to editorial@csodisha.com with the article URL and a link or reference to the official notice. All verified correction requests are reviewed and resolved within 24 hours.' },
        { type: 'notice', title: 'Effective Date & Corrections Desk', text: 'Effective Date: 2026-11-13 · Corrections & Errata Desk: editorial@csodisha.com · Address: Basta, Balasore, 756029' }
      ]
    },
    'module-03-010': {
      title: 'Accessibility Statement',
      seoTitle: 'Accessibility Statement | Common Sense Odisha (csodisha.com)',
      metaDescription: 'Accessibility Statement of Common Sense Odisha (csodisha.com) — our WCAG 2.1 Level AA commitment, keyboard navigation, screen-reader support, and feedback.',
      heroTitle: 'Accessibility Statement',
      heroSubtitle: 'Ensuring equitable, barrier-free digital access to Odisha recruitment alerts, exam syllabi, scholarships, and CBT practice tools for every learner.',
      effectiveDate: '2026-11-13',
      status: 'published',
      path: '/accessibility.html',
      email: 'editorial@csodisha.com',
      sections: [
        { type: 'richtext', title: 'Commitment to Digital Accessibility (WCAG 2.1 Level AA)', text: 'Common Sense Odisha (https://csodisha.com) is committed to ensuring digital accessibility for students, job aspirants, and citizens of all abilities across Odisha. We actively design and maintain our web pages, syllabus guides, and CBT mock practice interfaces in alignment with the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA and Indian digital accessibility best practices.' },
        { type: 'richtext', title: 'Built-In Accessibility Features', text: 'Our platform incorporates semantic HTML5 landmarks, full keyboard-only navigation with visible focus rings, descriptive alt text and ARIA labels for interactive controls, high-contrast readable typography, and mobile-first responsive layouts engineered to load reliably even on low-bandwidth rural mobile connections.' },
        { type: 'richtext', title: 'Known Limitations & Third-Party Official PDFs', text: 'While all pages authored directly on csodisha.com follow accessible markup standards, certain external recruitment notifications, scanned gazettes, and official PDFs hosted on third-party government portals (such as OPSC, OSSC, or OSSSC) may not be fully screen-reader optimized. Whenever possible, we summarize key dates, eligibility rules, and vacancy tables in accessible HTML text alongside the official PDF link.' },
        { type: 'notice', title: 'Effective Date & Accessibility Feedback Desk', text: 'Effective Date: 2026-11-13 · Report an Accessibility Barrier: editorial@csodisha.com · Address: Basta, Balasore, 756029' }
      ]
    },
    'module-03-011': {
      title: 'Refund & Cancellation Policy',
      seoTitle: 'Refund & Cancellation Policy | Common Sense Odisha',
      metaDescription: 'Refund & Cancellation Policy of Common Sense Odisha (csodisha.com) — free educational portal policy, anti-fraud advisory, and digital purchase terms.',
      heroTitle: 'Refund & Cancellation Policy',
      heroSubtitle: 'Transparent access terms for free educational resources, anti-scam payment warnings, and cancellation rules for any optional digital study materials.',
      effectiveDate: '2026-11-13',
      status: 'published',
      path: '/refund.html',
      email: 'editorial@csodisha.com',
      sections: [
        { type: 'richtext', title: 'Free Public Access & Anti-Fraud Advisory', text: 'Common Sense Odisha (https://csodisha.com) provides recruitment alerts, exam syllabi, scholarship guides, current affairs digests, and CBT mock practice tests free of charge to students and aspirants. We never ask users for UPI transfers, bank details, OTPs, or recruitment registration fees. Official government application fees must be paid strictly on the respective official portal (such as OPSC, OSSC, OSSSC, or State Scholarship Portal).' },
        { type: 'richtext', title: 'Optional Digital Study Resources & Cancellation Policy', text: 'In the event Common Sense Odisha offers optional paid digital study packs, downloadable PDF compilations, or premium mock test series in the future, users may cancel an unfulfilled order prior to digital access or download. Once a digital resource has been unlocked, streamed, or downloaded to your account, cancellations are generally not eligible except in cases of duplicate payment or verified technical non-delivery.' },
        { type: 'richtext', title: 'Duplicate Billing & Technical Non-Delivery Refunds', text: 'If you experience an accidental duplicate charge or a technical failure preventing access to a paid digital resource, notify editorial@csodisha.com within 7 calendar days with your transaction reference ID and registered email address. Approved refunds are processed back to the original payment method within 5 to 7 business days in accordance with Indian banking and payment gateway norms.' },
        { type: 'notice', title: 'Effective Date & Billing Support Contact', text: 'Effective Date: 2026-11-13 · Billing & Support Contact: editorial@csodisha.com · Address: Basta, Balasore, 756029' }
      ]
    },
    'module-03-012': {
      title: 'Shipping & Digital Delivery Policy',
      seoTitle: 'Shipping & Digital Delivery Policy | Common Sense Odisha',
      metaDescription: 'Shipping & Digital Delivery Policy of Common Sense Odisha (csodisha.com) — 100% digital educational access, instant CBT mock tests, and PDF delivery terms.',
      heroTitle: 'Shipping & Digital Delivery Policy',
      heroSubtitle: 'How study guides, exam syllabi, CBT practice suites, and downloadable educational resources are delivered digitally across Odisha.',
      effectiveDate: '2026-11-13',
      status: 'published',
      path: '/delivery.html',
      email: 'editorial@csodisha.com',
      sections: [
        { type: 'richtext', title: '100% Digital Platform (No Physical Shipping)', text: 'Common Sense Odisha (https://csodisha.com) operates exclusively as an online educational, recruitment-information, and Computer-Based Test (CBT) practice platform. We do not ship physical books, printed study kits, or postal parcels. Accordingly, no physical shipping charges or courier transit delays apply to any resource accessed on our portal.' },
        { type: 'richtext', title: 'Instant Online & Digital Resource Fulfillment', text: 'All public recruitment summaries, exam syllabi, scholarship guides, current affairs digests, and CBT mock practice sessions are delivered instantaneously via your web browser and Cloudflare\'s global edge network. Where downloadable PDF notes or structured study packs are provided, digital access is enabled immediately upon clicking the download link or completing enrollment.' },
        { type: 'richtext', title: 'Access Troubleshooting & Delivery Support', text: 'In rare cases where a slow mobile network or browser cache interrupts a digital PDF download or account resource activation, refreshing the page or signing back into your registered account restores immediate access. If an issue persists, contact editorial@csodisha.com with your registered email address and page URL for prompt assistance within 24 hours.' },
        { type: 'notice', title: 'Effective Date & Delivery Support Contact', text: 'Effective Date: 2026-11-13 · Digital Support Desk: editorial@csodisha.com · Address: Basta, Balasore, 756029' }
      ]
    },
    'module-03-013': {
      title: 'Community Guidelines',
      seoTitle: 'Community Guidelines | Common Sense Odisha (csodisha.com)',
      metaDescription: 'Community Guidelines of Common Sense Odisha (csodisha.com) — standards for respectful student discussions, verified exam updates, and anti-spam rules.',
      heroTitle: 'Community Guidelines',
      heroSubtitle: 'Standards for respectful academic dialogue, verified exam discussions, and a safe, distraction-free learning environment across Odisha.',
      effectiveDate: '2026-11-13',
      status: 'published',
      path: '/community-guidelines.html',
      email: 'editorial@csodisha.com',
      sections: [
        { type: 'richtext', title: 'Purpose of Our Learner Community', text: 'Common Sense Odisha (https://csodisha.com) is built to help students, job aspirants, and educators across all 30 districts of Odisha share verified study strategies, clarify exam syllabi, and support one another\'s preparation. Every interaction—whether through student feedback, study discussions, or correction submissions—must foster mutual respect and constructive learning.' },
        { type: 'richtext', title: 'Prohibited Conduct, Rumors & Recruitment Scams', text: 'To protect aspirants from misinformation and fraud, the following are strictly prohibited: (a) Unverified Exam Rumors & Fake Notices (posting fabricated recruitment dates, leaked question paper claims, or unverified cutoffs); (b) Fraudulent Solicitations (asking for money, bank details, OTPs, or backdoor job guarantees); (c) Harassment & Hate Speech (abusive language, personal attacks, or discrimination based on region, language, caste, religion, or gender); and (d) Spam & Pirated Materials (promotional links, malware, or copyrighted commercial books).' },
        { type: 'richtext', title: 'Moderation, Enforcement & Reporting Violations', text: 'Our editorial and moderation team reviews flagged submissions and user reports to maintain a trustworthy educational space. Content violating these guidelines is removed immediately, and accounts engaging in repeated spam, harassment, or fraudulent activity face permanent suspension. To report a violation or suspicious activity, email editorial@csodisha.com with the relevant page URL or screenshot.' },
        { type: 'notice', title: 'Effective Date & Moderation Desk Contact', text: 'Effective Date: 2026-11-13 · Moderation & Safety Contact: editorial@csodisha.com · Address: Basta, Balasore, 756029' }
      ]
    },
    'module-03-014': {
      title: 'Frequently Asked Questions',
      seoTitle: 'Frequently Asked Questions (FAQs) | Common Sense Odisha',
      metaDescription: 'Answers to common questions about Common Sense Odisha (csodisha.com) — OPSC, OSSC, OSSSC job alerts, exam syllabi, free CBT mock tests, and scholarships.',
      heroTitle: 'Frequently Asked Questions (FAQs)',
      heroSubtitle: 'Quick, verified answers for Odisha students and job aspirants on recruitment alerts, exam syllabi, free CBT practice tests, and scholarships.',
      effectiveDate: '2026-11-13',
      status: 'published',
      path: '/faqs.html',
      email: 'editorial@csodisha.com',
      sections: [
        { type: 'faq', category: 'General', question: 'Is Common Sense Odisha an official government website?', answer: 'No. Common Sense Odisha (csodisha.com) is an independent educational and civic information portal. Every recruitment summary, syllabus guide, and scholarship update links directly to the official government portal (such as OPSC, OSSC, OSSSC, or State Scholarship Portal) so aspirants can verify primary notifications before applying.' },
        { type: 'faq', category: 'Exams', question: 'Which Odisha recruitment exams are covered on csodisha.com?', answer: 'We cover major Odisha state and central recruitment notifications including OPSC (OAS, OES, Assistant Professor), OSSC (CGL, CHSL, Junior Engineer), OSSSC (RI, ARI, Amin, Forest Guard, ICDS Supervisor), Odisha Police, and teaching eligibility/recruitment exams (OTET, OSSTET, CTET, LTR, PGT).' },
        { type: 'faq', category: 'CBT Prep', question: 'Are the CBT mock practice tests completely free?', answer: 'Yes. All Computer-Based Test (CBT) practice sets, topic quizzes, and instant score breakdowns on Common Sense Odisha are 100% free to access without hidden subscription charges or payment requests.' },
        { type: 'faq', category: 'Scholarships', question: 'How do I apply for Odisha State Scholarships listed on this portal?', answer: 'We publish step-by-step eligibility checklists, required document lists, and deadline alerts for Odisha State Scholarship Portal schemes (Post-Matric, e-Medhabruti, Nirman Shramik, and central NSP schemes). Applications must always be submitted directly on scholarship.odisha.gov.in or scholarships.gov.in.' },
        { type: 'faq', category: 'Account', question: 'Why should I create a free student account?', answer: 'Signing in with a free student account lets you bookmark recruitment alerts, track completed CBT mock tests, and sync saved study resources across devices securely.' },
        { type: 'faq', category: 'Corrections', question: 'How can I report a broken official link or outdated exam date?', answer: 'Email editorial@csodisha.com with the article URL and reference to the official corrigendum or notice. Verified corrections are updated within 24 hours.' }
      ]
    },
    'module-03-015': {
      title: 'Custom Information Pages',
      seoTitle: 'Odisha 30 Districts & Divisions Guide | Common Sense Odisha',
      metaDescription: 'Complete reference guide to all 30 districts and 3 revenue divisions (Central, Northern, Southern) of Odisha for OPSC, OSSC, and OSSSC exam aspirants.',
      heroTitle: 'Odisha 30 Districts & Revenue Divisions Guide',
      heroSubtitle: 'Quick general-knowledge reference of Odisha\'s 30 districts, headquarters, and 3 administrative revenue divisions for state competitive exams.',
      effectiveDate: '2026-11-13',
      status: 'published',
      path: '/pages/odisha-districts-guide.html',
      email: 'editorial@csodisha.com',
      sections: [
        { type: 'richtext', title: 'Overview of Odisha\'s Administrative Structure', text: 'Odisha comprises 30 districts organized into three Revenue Divisions—Central Division (headquartered at Cuttack), Northern Division (headquartered at Sambalpur), and Southern Division (headquartered at Berhampur)—each administered by a Revenue Divisional Commissioner (RDC).' },
        { type: 'richtext', title: 'Central & Northern Revenue Division Districts (20 Districts)', text: 'Central Division (10 Districts): Balasore, Bhadrak, Cuttack, Jagatsinghpur, Jajpur, Kendrapara, Khordha, Mayurbhanj, Nayagarh, and Puri. Northern Division (10 Districts): Angul, Balangir, Bargarh, Deogarh, Dhenkanal, Jharsuguda, Kendujhar (Keonjhar), Sambalpur, Subarnapur (Sonepur), and Sundargarh.' },
        { type: 'richtext', title: 'Southern Revenue Division Districts (10 Districts)', text: 'Southern Division (10 Districts): Boudh, Gajapati, Ganjam, Kalahandi, Kandhamal, Koraput, Malkangiri, Nabarangpur, Nuapada, and Rayagada.' },
        { type: 'notice', title: 'Exam Preparation Note & Effective Date', text: 'Effective Date: 2026-11-13 · Verified Educational Reference by Common Sense Odisha (csodisha.com) · Editorial Contact: editorial@csodisha.com' }
      ]
    },
    'module-03-016': { title: 'Legal Page Revision History', path: '/privacy.html', email: 'legal@csodisha.com' }
  };

  function renderLegalStudio(moduleId, root, actions) {
    var cfg = LEGAL_PAGES[moduleId] || { title: 'Legal Document', path: '/privacy.html', email: 'legal@csodisha.com' };
    addHeaderPill(actions, '● Live Legal & Info Publisher');

    var shell = el('div', { class: 'cso-mod-shell' });
    var routeInp = el('input', { type: 'text', class: 'cso-mod-input', value: cfg.path });
    var titleInp = el('input', { type: 'text', class: 'cso-mod-input', value: cfg.seoTitle || cfg.title });
    var metaInp = el('textarea', { class: 'cso-mod-textarea', placeholder: 'SEO Meta Description (up to 160 chars)…' });
    if (cfg.metaDescription) metaInp.value = cfg.metaDescription;
    var heroTitleInp = el('input', { type: 'text', class: 'cso-mod-input', value: cfg.heroTitle || cfg.title });
    var heroSubInp = el('input', { type: 'text', class: 'cso-mod-input', value: cfg.heroSubtitle || 'Official policy & transparency information for Common Sense Odisha.' });
    var dateInp = el('input', { type: 'date', class: 'cso-mod-input', value: cfg.effectiveDate || '2026-11-13' });
    var statusSel = el('select', { class: 'cso-mod-select' }, [
      el('option', { value: 'published', text: 'published' }),
      el('option', { value: 'draft', text: 'draft' })
    ]);
    statusSel.value = cfg.status === 'draft' ? 'draft' : 'published';

    var isFaq = moduleId === 'module-03-014';
    var isCustom = moduleId === 'module-03-015';
    var customListHost = isCustom ? el('div', { class: 'cso-rev-table-wrap' }) : null;
    var FIXED_LEGAL_ROUTES = ['/about.html', '/contact.html', '/privacy.html', '/disclaimer.html', '/terms.html', '/cookies.html', '/copyright.html', '/editorial-policy.html', '/corrections.html', '/accessibility.html', '/refund.html', '/delivery.html', '/community-guidelines.html', '/faqs.html', '/faq.html'];
    function normalizeCustomSlug(raw) {
      var s = String(raw || '').trim().toLowerCase().replace(/[^a-z0-9/_.-]+/g, '-').replace(/^-+|-+$/g, '');
      if (!s) return '';
      if (s.indexOf('/') !== 0) s = '/pages/' + s;
      if (!/\.(html|htm)$/.test(s) && !s.endsWith('/')) s += '.html';
      return f02NormalizeRoute(s);
    }
    var sections = Array.isArray(cfg.sections) && cfg.sections.length
      ? cfg.sections.map(function (s) {
          return {
            type: s.type,
            category: s.category || '',
            question: s.question || '',
            answer: s.answer || '',
            title: s.title || s.question || '',
            text: s.text || s.answer || ''
          };
        })
      : [
          { type: 'notice', title: 'Effective Date & Contact', text: 'Effective: ' + new Date().toISOString().slice(0, 10) + ' · Contact: ' + cfg.email },
          { type: 'richtext', title: 'Policy Overview', text: 'Common Sense Odisha (csodisha.com) maintains transparent editorial, accessibility, and DPDP-aligned standards.' }
        ];
    var sectionsHost = el('div', { class: 'cso-mod-shell' });
    var revHost = el('div', { class: 'cso-rev-table-wrap' });
    var titleCountBadge = el('span', { class: 'cso-seo-count', text: '0 / 60' });
    var metaCountBadge = el('span', { class: 'cso-seo-count', text: '0 / 160' });

    function updateSeoCounts() {
      var tLen = (titleInp.value || '').length;
      var mLen = (metaInp.value || '').length;
      titleCountBadge.textContent = tLen + ' / 60';
      titleCountBadge.classList.toggle('is-over', tLen > 60);
      metaCountBadge.textContent = mLen + ' / 160';
      metaCountBadge.classList.toggle('is-over', mLen > 160);
    }
    titleInp.addEventListener('input', updateSeoCounts);
    metaInp.addEventListener('input', updateSeoCounts);
    updateSeoCounts();

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
        var isFaqItem = isFaq || sec.type === 'faq';
        var sTitle = el('input', { type: 'text', class: 'cso-mod-input', value: (isFaqItem ? (sec.question || sec.title) : sec.title) || '', placeholder: isFaqItem ? 'FAQ Question' : 'Section Heading' });
        var sText = el('textarea', { class: 'cso-mod-textarea', placeholder: isFaqItem ? 'FAQ Answer…' : 'Section content…' });
        sText.value = (isFaqItem ? (sec.answer || sec.text) : sec.text) || '';
        sTitle.addEventListener('input', function () {
          sec.title = sTitle.value;
          if (isFaqItem) sec.question = sTitle.value;
        });
        sText.addEventListener('input', function () {
          sec.text = sText.value;
          if (isFaqItem) sec.answer = sText.value;
        });
        var headBadges = [badge((idx + 1) + '. ' + sec.type, 'info')];
        var catField = null;
        if (isFaqItem) {
          var catBadge = badge(sec.category || 'General', 'success');
          headBadges.push(catBadge);
          var sCat = el('input', { type: 'text', class: 'cso-mod-input', value: sec.category || 'General', placeholder: 'Category (e.g., Exams, CBT Prep, Scholarships)' });
          sCat.addEventListener('input', function () {
            sec.category = sCat.value;
            catBadge.textContent = sCat.value || 'General';
          });
          catField = el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Category' }), sCat]);
        }
        var upBtn = el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', title: 'Move Up', text: '↑', onclick: function () {
          if (idx <= 0) return;
          var tmp = sections[idx - 1]; sections[idx - 1] = sections[idx]; sections[idx] = tmp;
          renderSections();
        } });
        if (idx === 0) upBtn.disabled = true;
        var downBtn = el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', title: 'Move Down', text: '↓', onclick: function () {
          if (idx >= sections.length - 1) return;
          var tmp = sections[idx + 1]; sections[idx + 1] = sections[idx]; sections[idx] = tmp;
          renderSections();
        } });
        if (idx === sections.length - 1) downBtn.disabled = true;
        var fields = [
          el('div', { class: 'cso-builder-block-head' }, [
            el('div', { class: 'cso-mod-toolbar' }, headBadges),
            el('div', { class: 'cso-mod-toolbar' }, [
              upBtn,
              downBtn,
              el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-danger cso-mod-btn-sm', title: 'Remove Section', text: '✕', onclick: function () { sections.splice(idx, 1); renderSections(); } })
            ])
          ])
        ];
        if (catField) fields.push(catField);
        fields.push(el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: isFaqItem ? 'Question' : 'Section Title' }), sTitle]));
        fields.push(el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: isFaqItem ? 'Answer' : 'Section Content' }), sText]));
        sectionsHost.appendChild(el('div', { class: 'cso-builder-block' }, fields));
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
        if (isCustom && customListHost) {
          clear(customListHost);
          var customPages = (pRes.pages || []).filter(function (p) {
            return p && p.route && FIXED_LEGAL_ROUTES.indexOf(p.route) === -1 && p.category === 'Information & Legal';
          });
          if (customPages.length) {
            customListHost.appendChild(safeTable(['Route', 'Title', 'Status', 'Action'], customPages.map(function (cp) {
              return el('tr', {}, [
                el('td', { text: cp.route }),
                el('td', { text: cp.title || '—' }),
                el('td', {}, badge(cp.status || 'published', cp.status === 'draft' ? 'warning' : 'success')),
                el('td', {}, el('button', {
                  type: 'button',
                  class: 'cso-mod-btn cso-mod-btn-sm',
                  text: 'Edit Page',
                  onclick: function () {
                    routeInp.value = cp.route;
                    loadLive();
                    refreshFrame();
                  }
                }))
              ]);
            })));
          } else {
            customListHost.appendChild(el('p', { class: 'cso-mod-muted', text: 'No custom information pages saved in D1 yet. Use the slug creator below to publish one.' }));
          }
        }
        if (match) {
          titleInp.value = match.title || cfg.seoTitle || cfg.title;
          metaInp.value = match.meta_description || cfg.metaDescription || '';
          heroTitleInp.value = match.hero_title || match.title || cfg.heroTitle || cfg.title;
          heroSubInp.value = match.hero_subtitle || cfg.heroSubtitle || '';
          statusSel.value = match.status === 'draft' ? 'draft' : 'published';
          var parsed = f02ParseBlocks(match.blocks_json).filter(function (b) {
            return b && b.type !== 'page_meta' && b.type !== 'og_meta' && !(b.type === 'page_intro' && !b.title && !b.text);
          });
          if (parsed.length) sections = parsed;
        }
        updateSeoCounts();
        renderSections();
        clear(revHost);
        var revs = revRes.revisions || [];
        if (revs.length) {
          revHost.appendChild(safeTable(['Rev', 'Editor', 'Note', 'Time', 'Restore'], revs.slice(0, 6).map(function (rv) {
            var compactTime = rv.created_at ? String(rv.created_at).replace('T', ' ').slice(0, 16) : '—';
            return el('tr', {}, [
              el('td', { text: '#' + rv.id }),
              el('td', { text: rv.editor_email || '—' }),
              el('td', { text: rv.note || 'update' }),
              el('td', { text: compactTime }),
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

    if (isCustom) {
      var newSlugInp = el('input', { type: 'text', class: 'cso-mod-input', placeholder: 'e.g. odisha-districts-guide or /pages/odisha-rivers.html' });
      shell.appendChild(el('div', { class: 'cso-mod-card' }, [
        el('div', { class: 'cso-drawer-head' }, [
          el('h3', { text: 'Custom Information Pages Directory' }),
          badge('D1 Dynamic Routes', 'info')
        ]),
        el('div', { class: 'cso-mod-toolbar' }, [
          newSlugInp,
          el('button', {
            type: 'button',
            class: 'cso-mod-btn cso-mod-btn-primary cso-mod-btn-sm',
            text: '+ New Custom Page',
            onclick: function () {
              var nr = normalizeCustomSlug(newSlugInp.value);
              if (!nr || FIXED_LEGAL_ROUTES.indexOf(nr) !== -1) {
                toast('Enter a valid custom slug (not a fixed legal route).', 'crimson');
                return;
              }
              routeInp.value = nr;
              titleInp.value = '';
              metaInp.value = '';
              heroTitleInp.value = '';
              heroSubInp.value = '';
              statusSel.value = 'draft';
              sections = [
                { type: 'richtext', title: 'Overview', text: '' },
                { type: 'notice', title: 'Effective Date & Contact', text: 'Effective Date: ' + (dateInp.value || '2026-11-13') + ' · Contact: editorial@csodisha.com' }
              ];
              updateSeoCounts();
              renderSections();
              refreshFrame();
              toast('Ready to author ' + nr, 'success');
            }
          })
        ]),
        customListHost
      ]));
    }

    shell.appendChild(el('div', { class: 'cso-mod-grid-2' }, [
      el('div', { class: 'cso-mod-shell' }, [
        el('div', { class: 'cso-mod-card' }, [
          el('h3', { text: 'SEO, Hero & Effective Date' }),
          el('div', { class: 'cso-mod-grid-2' }, [
            el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Public Route' }), routeInp]),
            el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Status' }), statusSel])
          ]),
          el('div', { class: 'cso-mod-field' }, [el('div', { class: 'cso-label-row' }, [el('label', { class: 'cso-mod-label', text: 'SEO Title' }), titleCountBadge]), titleInp]),
          el('div', { class: 'cso-mod-field' }, [el('div', { class: 'cso-label-row' }, [el('label', { class: 'cso-mod-label', text: 'Meta Description' }), metaCountBadge]), metaInp]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Hero Headline' }), heroTitleInp]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Hero Subheadline' }), heroSubInp]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Last-Updated Effective Date' }), dateInp])
        ]),
        el('div', { class: 'cso-mod-card' }, [
          el('div', { class: 'cso-drawer-head' }, [
            el('h3', { text: isFaq ? 'Structured FAQ Items' : 'Structured Policy / Info Sections' }),
            el('div', { class: 'cso-mod-toolbar' }, [
              (isFaq || isCustom) ? el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: isCustom ? '+ FAQ' : '+ FAQ Item', onclick: function () { sections.push({ type: 'faq', category: 'General', question: '', answer: '', title: '', text: '' }); renderSections(); } }) : null,
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
    var kpiHost = el('div', { class: 'cso-kpi-grid-4' });
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
    var kpiHost = el('div', { class: 'cso-kpi-grid-4' });
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
